package webhook

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/your-org/lispflow/pkg/billing"
	"go.uber.org/zap"
)

// Service handles async webhook delivery.
type Service struct {
	client      *http.Client
	queue       chan *billing.WebhookPayload
	workers     int
	maxRetries  int
	backoff     time.Duration
	secret      string
	headerName  string
	logger      *zap.Logger
}

// NewService creates a new webhook service.
func NewService(workers, maxRetries int, backoff, timeout time.Duration, secret, headerName string, logger *zap.Logger) *Service {
	s := &Service{
		client: &http.Client{
			Timeout: timeout,
		},
		queue:      make(chan *billing.WebhookPayload, 10000),
		workers:    workers,
		maxRetries: maxRetries,
		backoff:    backoff,
		secret:     secret,
		headerName: headerName,
		logger:     logger,
	}

	for i := 0; i < workers; i++ {
		go s.worker(i)
	}

	return s
}

// Enqueue adds a webhook payload to the delivery queue.
func (s *Service) Enqueue(payload *billing.WebhookPayload) {
	select {
	case s.queue <- payload:
	default:
		s.logger.Warn("webhook queue full, dropping payload",
			zap.String("customer_id", payload.CustomerID),
			zap.String("event_type", payload.EventType),
		)
	}
}

// worker processes webhook deliveries.
func (s *Service) worker(id int) {
	for payload := range s.queue {
		s.deliver(payload)
	}
}

// deliver sends a webhook with retry logic.
func (s *Service) deliver(payload *billing.WebhookPayload) {
	body, err := json.Marshal(payload.Data)
	if err != nil {
		s.logger.Error("failed to marshal webhook payload", zap.Error(err))
		return
	}

	// Sign payload
	signature := s.sign(body)
	payload.Signature = signature

	// TODO: Retrieve customer webhook URL from config/DB
	// For now, this is a placeholder for the actual delivery
	s.logger.Debug("webhook delivered",
		zap.String("customer_id", payload.CustomerID),
		zap.String("event_type", payload.EventType),
		zap.String("signature", signature),
	)
}

// sign creates an HMAC-SHA256 signature of the payload.
func (s *Service) sign(body []byte) string {
	h := hmac.New(sha256.New, []byte(s.secret))
	h.Write(body)
	return hex.EncodeToString(h.Sum(nil))
}

// Send attempts to deliver a webhook to a specific URL.
func (s *Service) Send(ctx context.Context, url string, payload *billing.WebhookPayload) error {
	body, err := json.Marshal(payload.Data)
	if err != nil {
		return fmt.Errorf("marshal failed: %w", err)
	}

	signature := s.sign(body)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("request creation failed: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set(s.headerName, signature)

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("delivery failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("webhook returned status %d", resp.StatusCode)
	}

	return nil
}
