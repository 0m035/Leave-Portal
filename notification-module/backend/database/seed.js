const bcrypt = require("bcryptjs");
const sequelize = require("../config/database");
const User = require("../models/User");
const Leave = require("../models/Leave");
const Notification = require("../models/Notification");

const seedUsers = [
  {
    id: "FAC-101",
    name: "Dr. Nilesh Bhosale",
    email: "faculty@apcoer.edu.in",
    role: "FACULTY",
    department: "Computer Engineering",
    password: "password123"
  },
  {
    id: "HOD-201",
    name: "Prof. Snehal Patil",
    email: "hod@apcoer.edu.in",
    role: "HOD",
    department: "Computer Engineering",
    password: "password123"
  },
  {
    id: "PRIN-301",
    name: "Dr. Sunil Thakare",
    email: "principal@apcoer.edu.in",
    role: "PRINCIPAL",
    department: "Administration",
    password: "password123"
  },
  {
    id: "CLK-401",
    name: "Mr. Sanjay Shinde",
    email: "clerk@apcoer.edu.in",
    role: "CLERK",
    department: "Office Staff",
    password: "password123"
  },
  {
    id: "ADM-001",
    name: "System Administrator",
    email: "admin@apcoer.edu.in",
    role: "ADMIN",
    department: "IT Support",
    password: "password123"
  }
];

async function seed() {
  try {
    console.log("Starting database seeding process...");
    
    // Connect and Sync tables
    await sequelize.sync({ force: true });
    console.log("Database tables synchronized and cleared.");

    for (const u of seedUsers) {
      const hashedPassword = await bcrypt.hash(u.password, 10);
      await User.create({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
        password: hashedPassword
      });
      console.log(`Created User [${u.role}] - ${u.name}`);
    }

    // Seed a couple of default sample leaves
    await Leave.create({
      leave_id: "leave-sample-01",
      faculty_id: "FAC-101",
      leave_type: "Casual Leave",
      from_date: "2026-06-01",
      to_date: "2026-06-03",
      reason: "Attending international research conference in Hyderabad.",
      status: "PENDING"
    });

    await Leave.create({
      leave_id: "leave-sample-02",
      faculty_id: "FAC-101",
      leave_type: "Medical Leave",
      from_date: "2026-05-10",
      to_date: "2026-05-12",
      reason: "Dental root canal surgical treatment and recovery.",
      status: "APPROVED",
      approved_by: "HOD-201",
      remarks: "Approved for medical reasons. Please arrange syllabus adjustment."
    });

    console.log("\nDefault leave records seeded.");
    console.log("\nDatabase seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Database seeding failed:", error);
    process.exit(1);
  }
}

seed();
