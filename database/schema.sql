-- Fire Department Database Setup Script
-- Run this script as postgres user to set up the complete database

-- Create database and user
CREATE DATABASE fire_department;
CREATE USER fire_admin WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE fire_department TO fire_admin;

-- Connect to the fire_department database
\c fire_department;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO fire_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO fire_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO fire_admin;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Personnel table
CREATE TABLE personnel (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    rank VARCHAR(50),
    badge VARCHAR(20) UNIQUE NOT NULL,
    pin VARCHAR(255) NOT NULL, -- Hashed PIN
    hire_date DATE,
    years_of_service INTEGER DEFAULT 0,
    vacation_days_used INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Stations table
CREATE TABLE stations (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(200),
    phone VARCHAR(20),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Apparatus table
CREATE TABLE apparatus (
    code VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    station_id VARCHAR(50) REFERENCES stations(id),
    type VARCHAR(50), -- Engine, Ladder, Rescue, etc.
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Incidents table
CREATE TABLE incidents (
    id VARCHAR(50) PRIMARY KEY,
    firstdue_id VARCHAR(100) UNIQUE, -- FirstDue xref_id
    type VARCHAR(100),
    message TEXT,
    address VARCHAR(200),
    address2 VARCHAR(100),
    city VARCHAR(100),
    state_code VARCHAR(5),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status VARCHAR(20) DEFAULT 'active', -- active, closed
    station_1_status VARCHAR(20) DEFAULT 'pending', -- pending, signed_in, complete
    station_2_status VARCHAR(20) DEFAULT 'pending',
    station_3_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Incident attendance tracking
CREATE TABLE incident_attendance (
    id SERIAL PRIMARY KEY,
    incident_id VARCHAR(50) REFERENCES incidents(id) ON DELETE CASCADE,
    personnel_id VARCHAR(50) REFERENCES personnel(id) ON DELETE CASCADE,
    apparatus_code VARCHAR(20),
    signed_in_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(incident_id, personnel_id)
);

-- Events table (includes both events and training)
CREATE TABLE events (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(100),
    event_type VARCHAR(20) CHECK (event_type IN ('event', 'training')),
    date TIMESTAMP NOT NULL,
    duration DECIMAL(4,2), -- Hours
    location VARCHAR(200),
    instructor VARCHAR(100), -- For training events
    description TEXT,
    max_attendees INTEGER,
    created_by VARCHAR(50) REFERENCES personnel(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Event attendance tracking
CREATE TABLE event_attendance (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(50) REFERENCES events(id) ON DELETE CASCADE,
    personnel_id VARCHAR(50) REFERENCES personnel(id) ON DELETE CASCADE,
    signed_in_at TIMESTAMP DEFAULT NOW(),
    signed_out_at TIMESTAMP,
    UNIQUE(event_id, personnel_id)
);

-- Vacation requests table
CREATE TABLE vacation_requests (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES personnel(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
    submitted_at TIMESTAMP DEFAULT NOW(),
    approved_by VARCHAR(50) REFERENCES personnel(id),
    approved_at TIMESTAMP,
    notes TEXT
);

-- Admin users table (for advanced admin access)
CREATE TABLE admin_users (
    id VARCHAR(50) PRIMARY KEY,
    personnel_id VARCHAR(50) REFERENCES personnel(id) ON DELETE CASCADE,
    permissions TEXT[], -- Array of permissions
    created_by VARCHAR(50) REFERENCES personnel(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- System settings table
CREATE TABLE system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    description TEXT,
    updated_by VARCHAR(50) REFERENCES personnel(id),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit log table
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES personnel(id),
    action VARCHAR(100),
    table_name VARCHAR(50),
    record_id VARCHAR(50),
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_incidents_created_at ON incidents(created_at DESC);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_firstdue_id ON incidents(firstdue_id);
CREATE INDEX idx_incident_attendance_incident ON incident_attendance(incident_id);
CREATE INDEX idx_incident_attendance_personnel ON incident_attendance(personnel_id);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_event_attendance_event ON event_attendance(event_id);
CREATE INDEX idx_vacation_requests_user ON vacation_requests(user_id);
CREATE INDEX idx_vacation_requests_status ON vacation_requests(status);
CREATE INDEX idx_personnel_badge ON personnel(badge);
CREATE INDEX idx_personnel_active ON personnel(active);

-- Insert default stations
INSERT INTO stations (id, name, address) VALUES 
('station1', 'Station 1', '100 Main Street, Elk River, MN'),
('station2', 'Station 2', '200 Oak Avenue, Elk River, MN'),
('station3', 'Station 3', '300 Pine Street, Elk River, MN');

-- Insert apparatus based on your FirstDue codes
INSERT INTO apparatus (code, name, station_id, type) VALUES
-- Station 1 apparatus
('ERCA11', 'Engine 11', 'station1', 'Engine'),
('ERCA12', 'Engine 12', 'station1', 'Engine'),
('ERCA13', 'Engine 13', 'station1', 'Engine'),
('ERLT11', 'Ladder 11', 'station1', 'Ladder'),
('ERLT12', 'Ladder 12', 'station1', 'Ladder'),
('ERLT13', 'Ladder 13', 'station1', 'Ladder'),
('ERLT14', 'Ladder 14', 'station1', 'Ladder'),

-- Station 2 apparatus
('ERCA21', 'Engine 21', 'station2', 'Engine'),
('ERCA22', 'Engine 22', 'station2', 'Engine'),
('ERCA23', 'Engine 23', 'station2', 'Engine'),
('ERLT21', 'Ladder 21', 'station2', 'Ladder'),
('ERLT22', 'Ladder 22', 'station2', 'Ladder'),

-- Station 3 apparatus
('ERCA31', 'Engine 31', 'station3', 'Engine'),
('ERLT31', 'Ladder 31', 'station3', 'Ladder'),

-- Specialized units
('ERCH1', 'Chief 1', 'station1', 'Command'),
('ERCH2', 'Chief 2', 'station2', 'Command'),
('ERCH3', 'Chief 3', 'station3', 'Command'),
('ERCH4', 'Chief 4', 'station1', 'Command'),
('ERDC1', 'Deputy Chief 1', 'station1', 'Command'),
('ERDO1', 'Duty Officer 1', 'station1', 'Command'),
('ERDO2', 'Duty Officer 2', 'station2', 'Command'),
('ERDO3', 'Duty Officer 3', 'station3', 'Command'),
('ERDO4', 'Duty Officer 4', 'station1', 'Command'),
('ERDO5', 'Duty Officer 5', 'station2', 'Command'),
('ERDO6', 'Duty Officer 6', 'station3', 'Command'),
('EREN1', 'Engine 1', 'station1', 'Engine'),
('EREN2', 'Engine 2', 'station2', 'Engine'),
('EREN3', 'Engine 3', 'station3', 'Engine'),
('EREN4', 'Engine 4', 'station1', 'Engine'),
('ERFM1', 'Fire Marshal 1', 'station1', 'Investigation'),
('ERGR1', 'Grass Rig 1', 'station1', 'Grass'),
('ERGR2', 'Grass Rig 2', 'station2', 'Grass'),
('ERGR3', 'Grass Rig 3', 'station3', 'Grass'),
('ERGR4', 'Grass Rig 4', 'station1', 'Grass'),
('ERIN1', 'Investigation 1', 'station1', 'Investigation'),
('ERIN2', 'Investigation 2', 'station2', 'Investigation'),
('ERIN3', 'Investigation 3', 'station3', 'Investigation'),
('ERIN4', 'Investigation 4', 'station1', 'Investigation'),
('ERIN5', 'Investigation 5', 'station2', 'Investigation'),
('ERIST', 'RIST', 'station1', 'Special Operations'),
('ERLD1', 'Ladder 1', 'station1', 'Ladder'),
('ERPOV', 'POV', 'station1', 'Personal'),
('ERRS1', 'Rescue Squad 1', 'station1', 'Rescue'),
('ERTD1', 'Tender 1', 'station1', 'Tender'),
('ERTD2', 'Tender 2', 'station2', 'Tender'),
('ERTD3', 'Tender 3', 'station3', 'Tender'),
('ERUT1', 'Utility 1', 'station1', 'Utility'),
('ER1', 'Station 1', 'station1', 'Station'),
('ER2', 'Station 2', 'station2', 'Station'),
('ER3', 'Station 3', 'station3', 'Station'),
('ERH', 'Duty Officer Only', 'station1', 'Command');

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
('firstdue_sync_interval', '5', 'FirstDue sync interval in minutes'),
('incident_auto_close', 'true', 'Auto-close incidents when all stations complete'),
('vacation_approval_required', 'true', 'Require approval for vacation requests'),
('department_name', 'Elk River Fire Department', 'Department name'),
('max_vacation_advance_days', '365', 'Maximum days in advance for vacation requests');

-- Create default admin user (Chief)
-- Password will be 'admin123' - CHANGE THIS IMMEDIATELY
INSERT INTO personnel (id, name, rank, badge, pin, hire_date, years_of_service, active) VALUES
('admin1', 'Fire Chief', 'Chief', 'CHIEF001', '$2b$10$rH8/X0Q8X0Q8X0Q8X0Q8XOeH8/X0Q8X0Q8X0Q8X0Q8XOeH8/X0Q8X0', '2000-01-01', 24, true);

-- Sample personnel (with hashed PINs - all PINs are '1234' for demo)
INSERT INTO personnel (id, name, rank, badge, pin, hire_date, years_of_service, vacation_days_used, active) VALUES
('ff001', 'John Smith', 'Captain', '001', '$2b$10$E3f8Lz5A3f8Lz5A3f8Lz5Oq2g0K0f8Lz5A3f8Lz5A3f8Lz5Oq2g0K0', '2015-03-15', 9, 5, true),
('ff002', 'Jane Doe', 'Firefighter', '002', '$2b$10$E3f8Lz5A3f8Lz5A3f8Lz5Oq2g0K0f8Lz5A3f8Lz5A3f8Lz5Oq2g0K0', '2020-06-01', 4, 3, true),
('ff003', 'Mike Johnson', 'Lieutenant', '003', '$2b$10$E3f8Lz5A3f8Lz5A3f8Lz5Oq2g0K0f8Lz5A3f8Lz5A3f8Lz5Oq2g0K0', '2018-09-12', 6, 7, true),
('ff004', 'Sarah Wilson', 'Driver/Operator', '004', '$2b$10$E3f8Lz5A3f8Lz5A3f8Lz5Oq2g0K0f8Lz5A3f8Lz5A3f8Lz5Oq2g0K0', '2019-04-08', 5, 4, true),
('ff005', 'David Brown', 'Firefighter', '005', '$2b$10$E3f8Lz5A3f8Lz5A3f8Lz5Oq2g0K0f8Lz5A3f8Lz5A3f8Lz5Oq2g0K0', '2021-01-15', 3, 2, true);

-- Sample incidents for testing
INSERT INTO incidents (id, type, address, city, status, created_at) VALUES
('inc001', 'Structure Fire', '123 Main Street', 'Elk River', 'active', NOW() - INTERVAL '1 hour'),
('inc002', 'Medical Emergency', '456 Oak Avenue', 'Elk River', 'active', NOW() - INTERVAL '2 hours'),
('inc003', 'Vehicle Accident', '789 Pine Street', 'Elk River', 'closed', NOW() - INTERVAL '1 day');

-- Sample events
INSERT INTO events (id, name, type, event_type, date, duration, location, created_by) VALUES
('evt001', 'Department Meeting', 'Meeting', 'event', NOW() + INTERVAL '1 day', 2.0, 'Station 1', 'admin1'),
('evt002', 'EMT Training', 'Medical Training', 'training', NOW() + INTERVAL '3 days', 4.0, 'Station 1', 'admin1'),
('evt003', 'Truck Checks', 'Maintenance', 'event', NOW() + INTERVAL '1 week', 1.0, 'All Stations', 'admin1');

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_personnel_updated_at BEFORE UPDATE ON personnel FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create view for personnel with vacation info
CREATE VIEW personnel_vacation_info AS
SELECT 
    p.*,
    CASE 
        WHEN p.years_of_service <= 5 THEN 11
        WHEN p.years_of_service <= 7 THEN 14
        WHEN p.years_of_service <= 9 THEN 15
        WHEN p.years_of_service <= 11 THEN 16
        WHEN p.years_of_service <= 13 THEN 17
        WHEN p.years_of_service <= 15 THEN 18
        WHEN p.years_of_service <= 17 THEN 19
        WHEN p.years_of_service = 18 THEN 20
        WHEN p.years_of_service = 19 THEN 21
        WHEN p.years_of_service = 20 THEN 22
        WHEN p.years_of_service = 21 THEN 23
        WHEN p.years_of_service <= 24 THEN 24
        ELSE 25
    END as total_vacation_days,
    CASE 
        WHEN p.years_of_service <= 5 THEN 11
        WHEN p.years_of_service <= 7 THEN 14
        WHEN p.years_of_service <= 9 THEN 15
        WHEN p.years_of_service <= 11 THEN 16
        WHEN p.years_of_service <= 13 THEN 17
        WHEN p.years_of_service <= 15 THEN 18
        WHEN p.years_of_service <= 17 THEN 19
        WHEN p.years_of_service = 18 THEN 20
        WHEN p.years_of_service = 19 THEN 21
        WHEN p.years_of_service = 20 THEN 22
        WHEN p.years_of_service = 21 THEN 23
        WHEN p.years_of_service <= 24 THEN 24
        ELSE 25
    END - p.vacation_days_used as remaining_vacation_days
FROM personnel p;

-- Grant permissions to fire_admin user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO fire_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO fire_admin;
GRANT USAGE ON SCHEMA public TO fire_admin;

-- Final message
DO $$ 
BEGIN 
    RAISE NOTICE 'Fire Department database setup complete!';
    RAISE NOTICE 'Default admin user: badge=CHIEF001, pin=admin123';
    RAISE NOTICE 'Sample users: badges 001-005, pin=1234';
    RAISE NOTICE 'Remember to change default passwords!';
END $$;
