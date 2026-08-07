-- PostgreSQL Schema for LispFlow Billing Ledger
-- Run this to set up the transactional billing database.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS billing_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id VARCHAR(255) NOT NULL,
    plan_expr TEXT NOT NULL,
    usage_data JSONB NOT NULL,
    cost DECIMAL(18, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT positive_cost CHECK (cost >= 0)
);

CREATE INDEX idx_ledger_customer_id ON billing_ledger(customer_id);
CREATE INDEX idx_ledger_created_at ON billing_ledger(created_at DESC);
CREATE INDEX idx_ledger_period ON billing_ledger(period_start, period_end);

-- Table for storing customer pricing plans (versioned)
CREATE TABLE IF NOT EXISTS pricing_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id VARCHAR(255) NOT NULL,
    plan_expr TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activated_at TIMESTAMPTZ,

    CONSTRAINT unique_active_plan UNIQUE (customer_id, is_active)
);

CREATE INDEX idx_plans_customer ON pricing_plans(customer_id);

-- Function to atomically activate a new plan and deactivate the old one
CREATE OR REPLACE FUNCTION activate_plan(p_customer_id VARCHAR, p_plan_expr TEXT)
RETURNS UUID AS $$
DECLARE
    new_plan_id UUID;
BEGIN
    -- Deactivate current plan
    UPDATE pricing_plans 
    SET is_active = false 
    WHERE customer_id = p_customer_id AND is_active = true;

    -- Insert new plan
    INSERT INTO pricing_plans (customer_id, plan_expr, is_active, activated_at)
    VALUES (p_customer_id, p_plan_expr, true, NOW())
    RETURNING id INTO new_plan_id;

    RETURN new_plan_id;
END;
$$ LANGUAGE plpgsql;
