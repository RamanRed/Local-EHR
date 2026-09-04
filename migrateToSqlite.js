const fs = require('fs');
let s = fs.readFileSync('apps/server/prisma/schema.prisma', 'utf8');

// Handle provider and enums
s = s.replace(/enum Role \{[^]*?\}/, '');
s = s.replace(/role\s+Role/, 'role             String');
s = s.replace(/enum PatientStatus \{[^]*?\}/, '');
s = s.replace(/status\s+PatientStatus\s+@default\(WAITING\)/, 'status           String @default("WAITING")');
s = s.replace(/enum FollowUpStatus \{[^]*?\}/, '');
s = s.replace(/status\s+FollowUpStatus\s+@default\(PENDING\)/, 'status           String @default("PENDING")');
s = s.replace(/enum FollowUpCallStatus \{[^]*?\}/, '');
s = s.replace(/status\s+FollowUpCallStatus\s+@default\(scheduled\)/, 'status           String @default("scheduled")');
s = s.replace(/enum UrgencyLevel \{[^]*?\}/, '');
s = s.replace(/urgencyLevel\s+UrgencyLevel\s+@default\(medium\)/, 'urgencyLevel     String @default("medium")');
s = s.replace(/enum AppointmentType \{[^]*?\}/, '');
s = s.replace(/type\s+AppointmentType/, 'type             String');
s = s.replace(/enum AppointmentReason \{[^]*?\}/, '');
s = s.replace(/reason\s+AppointmentReason\?/, 'reason           String?');
s = s.replace(/enum AppointmentStatus \{[^]*?\}/, '');
s = s.replace(/status\s+AppointmentStatus\s+@default\(pending\)/, 'status           String @default("pending")');

// Nested replacements might be needed if they are used in multiple models (like User and another)
s = s.replace(/symptoms      String\[\]/, 'symptoms      String?');
s = s.replace(/icdCodes            Json\?/, 'icdCodes            String?');
s = s.replace(/structuredFindings  Json\?/, 'structuredFindings  String?');
s = s.replace(/findings            Json\?/, 'findings            String?');
s = s.replace(/suggestions         Json\?/, 'suggestions         String?');

fs.writeFileSync('apps/server/prisma/schema.prisma', s);
console.log('done via JS');