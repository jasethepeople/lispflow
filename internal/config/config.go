package config

import (
	"fmt"
	"time"

	"github.com/spf13/viper"
)

// Config holds all application configuration.
type Config struct {
	Server   ServerConfig   `mapstructure:"server"`
	Database DatabaseConfig `mapstructure:"database"`
	Redis    RedisConfig    `mapstructure:"redis"`
	Billing  BillingConfig  `mapstructure:"billing"`
	Webhook  WebhookConfig  `mapstructure:"webhook"`
	Metrics  MetricsConfig  `mapstructure:"metrics"`
	Auth     AuthConfig     `mapstructure:"auth"`
	Log      LogConfig      `mapstructure:"log"`
}

// ServerConfig holds HTTP server settings.
type ServerConfig struct {
	Host            string        `mapstructure:"host"`
	Port            int           `mapstructure:"port"`
	ReadTimeout     time.Duration `mapstructure:"read_timeout"`
	WriteTimeout    time.Duration `mapstructure:"write_timeout"`
	IdleTimeout     time.Duration `mapstructure:"idle_timeout"`
	MaxHeaderBytes  int           `mapstructure:"max_header_bytes"`
	ShutdownTimeout time.Duration `mapstructure:"shutdown_timeout"`
}

// DatabaseConfig holds PostgreSQL connection settings.
type DatabaseConfig struct {
	Host            string        `mapstructure:"host"`
	Port            int           `mapstructure:"port"`
	User            string        `mapstructure:"user"`
	Password        string        `mapstructure:"password"`
	DBName          string        `mapstructure:"dbname"`
	SSLMode         string        `mapstructure:"sslmode"`
	MaxConns        int32         `mapstructure:"max_conns"`
	MinConns        int32         `mapstructure:"min_conns"`
	MaxConnLifetime time.Duration `mapstructure:"max_conn_lifetime"`
	MaxConnIdleTime time.Duration `mapstructure:"max_conn_idle_time"`
	HealthCheckPeriod time.Duration `mapstructure:"health_check_period"`
}

// RedisConfig holds Redis connection settings.
type RedisConfig struct {
	Host     string        `mapstructure:"host"`
	Port     int           `mapstructure:"port"`
	Password string        `mapstructure:"password"`
	DB       int           `mapstructure:"db"`
	PoolSize int           `mapstructure:"pool_size"`
	Timeout  time.Duration `mapstructure:"timeout"`
}

// BillingConfig holds billing engine settings.
type BillingConfig struct {
	SandboxEnabled       bool          `mapstructure:"sandbox_enabled"`
	MaxPlanSizeBytes     int           `mapstructure:"max_plan_size_bytes"`
	MaxEvalTimeMs        int           `mapstructure:"max_eval_time_ms"`
	BatchSize            int           `mapstructure:"batch_size"`
	BatchFlushInterval   time.Duration `mapstructure:"batch_flush_interval"`
	SimulationTimeout    time.Duration `mapstructure:"simulation_timeout"`
	DefaultCurrency      string        `mapstructure:"default_currency"`
}

// WebhookConfig holds webhook delivery settings.
type WebhookConfig struct {
	Enabled          bool          `mapstructure:"enabled"`
	MaxRetries       int           `mapstructure:"max_retries"`
	RetryBackoff     time.Duration `mapstructure:"retry_backoff"`
	Timeout          time.Duration `mapstructure:"timeout"`
	MaxPayloadSize   int           `mapstructure:"max_payload_size"`
	SecretHeader     string        `mapstructure:"secret_header"`
	QueueSize        int           `mapstructure:"queue_size"`
	Workers          int           `mapstructure:"workers"`
}

// MetricsConfig holds Prometheus metrics settings.
type MetricsConfig struct {
	Enabled     bool   `mapstructure:"enabled"`
	Path        string `mapstructure:"path"`
	Namespace   string `mapstructure:"namespace"`
	Subsystem   string `mapstructure:"subsystem"`
}

// AuthConfig holds JWT authentication settings.
type AuthConfig struct {
	Enabled    bool          `mapstructure:"enabled"`
	Secret     string        `mapstructure:"secret"`
	Issuer     string        `mapstructure:"issuer"`
	Audience   string        `mapstructure:"audience"`
	Expiry     time.Duration `mapstructure:"expiry"`
}

// LogConfig holds logging settings.
type LogConfig struct {
	Level      string `mapstructure:"level"`
	Format     string `mapstructure:"format"`
	Output     string `mapstructure:"output"`
	DevMode    bool   `mapstructure:"dev_mode"`
}

// Load reads configuration from file and environment variables.
func Load(path string) (*Config, error) {
	viper.SetConfigFile(path)
	viper.SetConfigType("yaml")

	// Defaults
	viper.SetDefault("server.host", "0.0.0.0")
	viper.SetDefault("server.port", 8080)
	viper.SetDefault("server.read_timeout", "10s")
	viper.SetDefault("server.write_timeout", "10s")
	viper.SetDefault("server.idle_timeout", "120s")
	viper.SetDefault("server.max_header_bytes", 1048576)
	viper.SetDefault("server.shutdown_timeout", "30s")

	viper.SetDefault("database.host", "localhost")
	viper.SetDefault("database.port", 5432)
	viper.SetDefault("database.sslmode", "require")
	viper.SetDefault("database.max_conns", 25)
	viper.SetDefault("database.min_conns", 5)
	viper.SetDefault("database.max_conn_lifetime", "1h")
	viper.SetDefault("database.max_conn_idle_time", "30m")
	viper.SetDefault("database.health_check_period", "5m")

	viper.SetDefault("redis.host", "localhost")
	viper.SetDefault("redis.port", 6379)
	viper.SetDefault("redis.db", 0)
	viper.SetDefault("redis.pool_size", 10)
	viper.SetDefault("redis.timeout", "5s")

	viper.SetDefault("billing.sandbox_enabled", true)
	viper.SetDefault("billing.max_plan_size_bytes", 65536)
	viper.SetDefault("billing.max_eval_time_ms", 100)
	viper.SetDefault("billing.batch_size", 100)
	viper.SetDefault("billing.batch_flush_interval", "5s")
	viper.SetDefault("billing.simulation_timeout", "30s")
	viper.SetDefault("billing.default_currency", "USD")

	viper.SetDefault("webhook.enabled", true)
	viper.SetDefault("webhook.max_retries", 3)
	viper.SetDefault("webhook.retry_backoff", "5s")
	viper.SetDefault("webhook.timeout", "10s")
	viper.SetDefault("webhook.max_payload_size", 1048576)
	viper.SetDefault("webhook.secret_header", "X-Webhook-Signature")
	viper.SetDefault("webhook.queue_size", 10000)
	viper.SetDefault("webhook.workers", 10)

	viper.SetDefault("metrics.enabled", true)
	viper.SetDefault("metrics.path", "/metrics")
	viper.SetDefault("metrics.namespace", "lispflow")
	viper.SetDefault("metrics.subsystem", "billing")

	viper.SetDefault("auth.enabled", true)
	viper.SetDefault("auth.issuer", "lispflow")
	viper.SetDefault("auth.audience", "lispflow-api")
	viper.SetDefault("auth.expiry", "24h")

	viper.SetDefault("log.level", "info")
	viper.SetDefault("log.format", "json")
	viper.SetDefault("log.output", "stdout")
	viper.SetDefault("log.dev_mode", false)

	// Environment variable overrides
	viper.SetEnvPrefix("LISPFLOW")
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("failed to read config: %w", err)
		}
	}

	var cfg Config
	if err := viper.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	return &cfg, nil
}

// DSN returns the PostgreSQL connection string.
func (d *DatabaseConfig) DSN() string {
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		d.Host, d.Port, d.User, d.Password, d.DBName, d.SSLMode)
}

// Addr returns the Redis address.
func (r *RedisConfig) Addr() string {
	return fmt.Sprintf("%s:%d", r.Host, r.Port)
}
