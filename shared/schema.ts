import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // 'admin' | 'teacher'
  name: text("name").notNull(),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  admissionNo: text("admission_no").notNull().unique(),
  name: text("name").notNull(),
  className: text("class_name").notNull(),
  section: text("section").notNull(),
  rollNo: text("roll_no").notNull(),
  email: text("email"),
  contactNo: text("contact_no"),
  parentContact: text("parent_contact"),
  photoUrl: text("photo_url"),
  qrCode: text("qr_code"),
  faceDescriptor: json("face_descriptor"), // For face recognition
  createdAt: timestamp("created_at").defaultNow(),
});

export const attendance = pgTable("attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => students.id),
  date: text("date").notNull(), // YYYY-MM-DD format
  status: text("status").notNull(), // 'present' | 'absent' | 'late'
  method: text("method"), // 'qr' | 'face' | 'manual'
  timestamp: timestamp("timestamp").defaultNow(),
  markedBy: varchar("marked_by").references(() => users.id),
});

export const attendanceReports = pgTable("attendance_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'daily' | 'weekly' | 'monthly' | 'custom'
  filters: json("filters"),
  data: json("data"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const classes = pgTable("classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  section: text("section").notNull(),
  teacherId: varchar("teacher_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true,
  qrCode: true,
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  timestamp: true,
});

export const insertClassSchema = createInsertSchema(classes).omit({
  id: true,
  createdAt: true,
});

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(["admin", "teacher"]),
});

// Bulk upload schema
export const bulkStudentSchema = z.array(
  z.object({
    admissionNo: z.string(),
    name: z.string(),
    className: z.string(),
    section: z.string(),
    rollNo: z.string(),
    email: z.string().email().optional(),
    contactNo: z.string().optional(),
    parentContact: z.string().optional(),
  })
);

// Parent portal schema
export const parentPortalSchema = z.object({
  admissionNo: z.string().min(1, "Admission number is required"),
});

// Report generation schema
export const reportGenerationSchema = z.object({
  type: z.enum(["daily", "weekly", "monthly", "custom"]),
  dateRange: z.object({
    from: z.string(),
    to: z.string(),
  }),
  className: z.string().optional(),
  format: z.enum(["excel", "csv", "pdf"]),
});

// Face recognition schema
export const faceRecognitionSchema = z.object({
  studentId: z.string(),
  imageData: z.string(), // base64 encoded image
  confidence: z.number().min(0).max(100),
});

// QR attendance schema
export const qrAttendanceSchema = z.object({
  qrData: z.string(),
  method: z.literal("qr"),
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendance.$inferSelect;
export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type AttendanceReport = typeof attendanceReports.$inferSelect;
export type LoginRequest = z.infer<typeof loginSchema>;
export type BulkStudent = z.infer<typeof bulkStudentSchema>;
export type ParentPortalRequest = z.infer<typeof parentPortalSchema>;
export type ReportGenerationRequest = z.infer<typeof reportGenerationSchema>;
export type FaceRecognitionRequest = z.infer<typeof faceRecognitionSchema>;
export type QRAttendanceRequest = z.infer<typeof qrAttendanceSchema>;
