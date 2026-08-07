package ingestion

import (
	"context"
	"sync"
	"time"

	"github.com/your-org/lispflow/internal/service"
	"github.com/your-org/lispflow/pkg/billing"
	"go.uber.org/zap"
)

// Batcher groups usage events by customer for efficient processing.
type Batcher struct {
	svc           *service.BillingService
	batchSize     int
	flushInterval time.Duration
	buffer        map[string][]billing.UsageEvent
	mu            sync.Mutex
	flushCh       chan struct{}
	stopCh        chan struct{}
	logger        *zap.Logger
}

// NewBatcher creates a new event batcher.
func NewBatcher(svc *service.BillingService, batchSize int, flushInterval time.Duration, logger *zap.Logger) *Batcher {
	b := &Batcher{
		svc:           svc,
		batchSize:     batchSize,
		flushInterval: flushInterval,
		buffer:        make(map[string][]billing.UsageEvent),
		flushCh:       make(chan struct{}, 1),
		stopCh:        make(chan struct{}),
		logger:        logger,
	}
	go b.flusher()
	return b
}

// Submit adds a usage event to the batch.
func (b *Batcher) Submit(event billing.UsageEvent) {
	b.mu.Lock()
	b.buffer[event.CustomerID] = append(b.buffer[event.CustomerID], event)
	shouldFlush := len(b.buffer[event.CustomerID]) >= b.batchSize
	b.mu.Unlock()

	if shouldFlush {
		select {
		case b.flushCh <- struct{}{}:
		default:
		}
	}
}

// flusher periodically flushes batches.
func (b *Batcher) flusher() {
	ticker := time.NewTicker(b.flushInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			b.flush()
		case <-b.flushCh:
			b.flush()
		case <-b.stopCh:
			b.flush()
			return
		}
	}
}

// flush processes all buffered events.
func (b *Batcher) flush() {
	b.mu.Lock()
	if len(b.buffer) == 0 {
		b.mu.Unlock()
		return
	}

	// Copy buffer and clear
	batch := make(map[string][]billing.UsageEvent)
	for k, v := range b.buffer {
		batch[k] = v
	}
	b.buffer = make(map[string][]billing.UsageEvent)
	b.mu.Unlock()

	now := time.Now().UTC()
	periodStart := now.Truncate(time.Hour * 24) // Daily periods
	periodEnd := periodStart.Add(time.Hour * 24)

	for customerID, events := range batch {
		// Aggregate dimensions per customer
		aggregated := make(map[string]float64)
		for _, event := range events {
			for dim, val := range event.Dimensions {
				aggregated[dim] += val
			}
		}

		_, err := b.svc.EvaluateAndRecord(context.Background(), customerID, aggregated, periodStart, periodEnd)
		if err != nil {
			b.logger.Error("batch flush error",
				zap.String("customer_id", customerID),
				zap.Int("events", len(events)),
				zap.Error(err),
			)
		} else {
			b.logger.Info("batch flushed",
				zap.String("customer_id", customerID),
				zap.Int("events", len(events)),
			)
		}
	}
}

// Stop gracefully shuts down the batcher.
func (b *Batcher) Stop() {
	close(b.stopCh)
}

// StreamProcessor handles real-time event streams.
type StreamProcessor struct {
	batcher *Batcher
	logger  *zap.Logger
}

// NewStreamProcessor creates a new stream processor.
func NewStreamProcessor(batcher *Batcher, logger *zap.Logger) *StreamProcessor {
	return &StreamProcessor{
		batcher: batcher,
		logger:  logger,
	}
}

// Process handles a single real-time event.
func (p *StreamProcessor) Process(event billing.UsageEvent) {
	p.batcher.Submit(event)
}
