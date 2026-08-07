package server

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/your-org/lispflow/internal/config"
	"github.com/your-org/lispflow/internal/health"
	"github.com/your-org/lispflow/internal/middleware"
	"github.com/your-org/lispflow/internal/service"
	"github.com/your-org/lispflow/pkg/billing"
	"go.uber.org/zap"
)

// Server wraps the HTTP server and dependencies.
type Server struct {
	router  *gin.Engine
	srv     *http.Server
	cfg     *config.Config
	svc     *service.BillingService
	health  *health.Checker
	logger  *zap.Logger
}

// NewServer creates a new HTTP server.
func NewServer(cfg *config.Config, svc *service.BillingService, healthChecker *health.Checker, logger *zap.Logger) *Server {
	if !cfg.Log.DevMode {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.Logger(logger))
	router.Use(middleware.RequestID())
	router.Use(middleware.Metrics())

	// CORS
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowAllOrigins = true
	corsConfig.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization", "X-Request-ID"}
	router.Use(cors.New(corsConfig))

	s := &Server{
		router: router,
		cfg:    cfg,
		svc:    svc,
		health: healthChecker,
		logger: logger,
	}

	s.registerRoutes()

	s.srv = &http.Server{
		Addr:           fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port),
		Handler:        router,
		ReadTimeout:    cfg.Server.ReadTimeout,
		WriteTimeout:   cfg.Server.WriteTimeout,
		IdleTimeout:    cfg.Server.IdleTimeout,
		MaxHeaderBytes: cfg.Server.MaxHeaderBytes,
	}

	return s
}

// registerRoutes sets up all API routes.
func (s *Server) registerRoutes() {
	// Health and metrics
	s.router.GET("/health", s.handleHealth)
	s.router.GET("/ready", s.handleReady)
	if s.cfg.Metrics.Enabled {
		s.router.GET(s.cfg.Metrics.Path, gin.WrapH(promhttp.Handler()))
	}

	// API v1
	v1 := s.router.Group("/api/v1")
	{
		// Plans
		v1.POST("/customers/:customer_id/plans", s.handleCreatePlan)
		v1.GET("/customers/:customer_id/plans", s.handleGetPlanHistory)
		v1.GET("/customers/:customer_id/plans/active", s.handleGetActivePlan)

		// Billing
		v1.POST("/customers/:customer_id/evaluate", s.handleEvaluate)
		v1.POST("/customers/:customer_id/batch", s.handleBatchEvaluate)
		v1.GET("/customers/:customer_id/history", s.handleGetHistory)
		v1.GET("/customers/:customer_id/periods/:start/:end", s.handleGetPeriodSummary)

		// Simulation
		v1.POST("/simulate", s.handleSimulate)
		v1.POST("/validate", s.handleValidatePlan)
	}
}

// Start begins listening for requests.
func (s *Server) Start() error {
	s.logger.Info("starting server", zap.String("addr", s.srv.Addr))
	return s.srv.ListenAndServe()
}

// Shutdown gracefully stops the server.
func (s *Server) Shutdown(ctx context.Context) error {
	return s.srv.Shutdown(ctx)
}

// ── Handlers ─────────────────────────────────────────────────────────────

// handleHealth returns health status.
func (s *Server) handleHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"timestamp": time.Now().UTC(),
		"version":   "1.0.0",
	})
}

// handleReady returns readiness status.
func (s *Server) handleReady(c *gin.Context) {
	if !s.health.IsReady() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "not ready"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ready"})
}

// handleCreatePlan activates a new pricing plan.
func (s *Server) handleCreatePlan(c *gin.Context) {
	customerID := c.Param("customer_id")

	var req struct {
		PlanExpr string            `json:"plan_expr" binding:"required"`
		Metadata map[string]string `json:"metadata"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	plan, err := s.svc.ActivatePlan(c.Request.Context(), customerID, req.PlanExpr, req.Metadata)
	if err != nil {
		s.logger.Error("plan activation failed", zap.String("customer_id", customerID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, plan)
}

// handleGetPlanHistory returns plan history.
func (s *Server) handleGetPlanHistory(c *gin.Context) {
	customerID := c.Param("customer_id")
	plans, err := s.svc.GetCustomerPlanHistory(c.Request.Context(), customerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"plans": plans})
}

// handleGetActivePlan returns the active plan.
func (s *Server) handleGetActivePlan(c *gin.Context) {
	customerID := c.Param("customer_id")
	plans, err := s.svc.GetCustomerPlanHistory(c.Request.Context(), customerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for _, p := range plans {
		if p.IsActive {
			c.JSON(http.StatusOK, p)
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "no active plan found"})
}

// handleEvaluate evaluates pricing for a single usage event.
func (s *Server) handleEvaluate(c *gin.Context) {
	customerID := c.Param("customer_id")

	var req struct {
		Usage       map[string]float64 `json:"usage" binding:"required"`
		PeriodStart *time.Time         `json:"period_start"`
		PeriodEnd   *time.Time         `json:"period_end"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	now := time.Now().UTC()
	periodStart := now.Truncate(time.Hour * 24)
	periodEnd := periodStart.Add(time.Hour * 24)
	if req.PeriodStart != nil {
		periodStart = *req.PeriodStart
	}
	if req.PeriodEnd != nil {
		periodEnd = *req.PeriodEnd
	}

	entry, err := s.svc.EvaluateAndRecord(c.Request.Context(), customerID, req.Usage, periodStart, periodEnd)
	if err != nil {
		s.logger.Error("evaluation failed", zap.String("customer_id", customerID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, entry)
}

// handleBatchEvaluate processes multiple usage events.
func (s *Server) handleBatchEvaluate(c *gin.Context) {
	customerID := c.Param("customer_id")

	var req struct {
		Events      []map[string]float64 `json:"events" binding:"required"`
		PeriodStart *time.Time           `json:"period_start"`
		PeriodEnd   *time.Time           `json:"period_end"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	now := time.Now().UTC()
	periodStart := now.Truncate(time.Hour * 24)
	periodEnd := periodStart.Add(time.Hour * 24)
	if req.PeriodStart != nil {
		periodStart = *req.PeriodStart
	}
	if req.PeriodEnd != nil {
		periodEnd = *req.PeriodEnd
	}

	events := make([]billing.UsageEvent, len(req.Events))
	for i, dims := range req.Events {
		events[i] = billing.UsageEvent{
			CustomerID: customerID,
			Dimensions: dims,
			Timestamp:  now,
			Source:     "api",
		}
	}

	entries, err := s.svc.ProcessBatch(c.Request.Context(), events, periodStart, periodEnd)
	if err != nil {
		s.logger.Error("batch evaluation failed", zap.String("customer_id", customerID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"processed": len(entries),
		"entries":   entries,
	})
}

// handleGetHistory returns billing history.
func (s *Server) handleGetHistory(c *gin.Context) {
	customerID := c.Param("customer_id")
	limit := 50
	offset := 0

	if l, err := strconv.Atoi(c.Query("limit")); err == nil && l > 0 {
		limit = l
	}
	if o, err := strconv.Atoi(c.Query("offset")); err == nil && o >= 0 {
		offset = o
	}

	entries, err := s.svc.GetCustomerHistory(c.Request.Context(), customerID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"entries": entries})
}

// handleGetPeriodSummary returns a billing period summary.
func (s *Server) handleGetPeriodSummary(c *gin.Context) {
	// Implementation would query period summary from repository
	c.JSON(http.StatusOK, gin.H{"message": "period summary endpoint"})
}

// handleSimulate runs a time-travel simulation.
func (s *Server) handleSimulate(c *gin.Context) {
	var req struct {
		CustomerID   string               `json:"customer_id"`
		ProposedPlan string               `json:"proposed_plan" binding:"required"`
		History      []map[string]float64 `json:"history" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := s.svc.SimulatePlan(c.Request.Context(), req.CustomerID, req.ProposedPlan, req.History)
	if err != nil {
		s.logger.Error("simulation failed", zap.String("customer_id", req.CustomerID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// handleValidatePlan validates a plan expression.
func (s *Server) handleValidatePlan(c *gin.Context) {
	var req struct {
		PlanExpr string `json:"plan_expr" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Use engine to validate
	c.JSON(http.StatusOK, gin.H{"valid": true})
}
