import { connectDatabase, disconnectDatabase } from "../config/database";
import { env } from "../config/env";
import User from "../models/user.model";
import Shelter from "../models/shelter.model";
import Volunteer from "../models/volunteer.model";
import Donor from "../models/donor.model";
import Disaster from "../models/disaster.model";
import Resource from "../models/resource.model";
import ResourceRequest from "../models/resourceRequest.model";
import { logger } from "../config/logger";

async function seed() {
  await connectDatabase();

  await Promise.all([
    User.deleteMany({}),
    Shelter.deleteMany({}),
    Volunteer.deleteMany({}),
    Donor.deleteMany({}),
    Disaster.deleteMany({}),
    Resource.deleteMany({}),
    ResourceRequest.deleteMany({}),
  ]);

  const admin = await User.create({
    name: "Platform Admin",
    email: env.SEED_ADMIN_EMAIL,
    password: env.SEED_ADMIN_PASSWORD,
    role: "admin",
    isActive: true,
    isEmailVerified: true,
  });

  const ngo = await User.create({
    name: "NGO Manager",
    email: "ngo@crisisloom.local",
    password: "Ngo@12345",
    role: "ngo_manager",
    phone: "+919800000001",
  });

  const shelterStaff = await User.create({
    name: "Shelter Staff",
    email: "shelter@crisisloom.local",
    password: "Shelter@123",
    role: "shelter_staff",
    phone: "+919800000002",
  });

  const volunteerUser = await User.create({
    name: "Aarav Volunteer",
    email: "volunteer@crisisloom.local",
    password: "Volunteer@123",
    role: "volunteer",
    phone: "+919800000003",
  });

  const donorUser = await User.create({
    name: "Donor Trust",
    email: "donor@crisisloom.local",
    password: "Donor@12345",
    role: "donor",
    phone: "+919800000004",
  });

  const disaster = await Disaster.create({
    title: "Mumbai Monsoon Flood",
    type: "flood",
    description: "Severe flooding across central Mumbai affecting shelters and supply routes.",
    severity: "critical",
    status: "active",
    location: { type: "Point", coordinates: [72.8777, 19.076] },
    radiusMeters: 15000,
    affectedAreas: ["Dadar", "Sion", "Kurla"],
    reportedBy: admin._id,
  });

  const shelter = await Shelter.create({
    shelterName: "Dadar Relief Camp",
    description: "Primary flood relief shelter",
    managedBy: shelterStaff._id,
    address: "Dadar East, Mumbai",
    city: "Mumbai",
    state: "Maharashtra",
    location: { type: "Point", coordinates: [72.842, 19.018] },
    contactPhone: "+912212345678",
    contactEmail: "dadar@crisisloom.local",
    capacity: 200,
    occupied: 120,
    disaster: disaster._id,
    isVerified: true,
  });

  await Resource.create({
    shelter: shelter._id,
    resourceType: "food",
    quantity: 40,
    unit: "packets",
    minThreshold: 50,
    lastUpdatedBy: shelterStaff._id,
  });

  await Volunteer.create({
    userId: volunteerUser._id,
    skills: ["food", "water", "medicine"],
    availability: "available",
    location: { type: "Point", coordinates: [72.85, 19.04] },
    radiusKm: 12,
    isVerified: true,
  });

  await Donor.create({
    userId: donorUser._id,
    organizationName: "Mumbai Relief Trust",
    donorType: "organization",
    location: { type: "Point", coordinates: [72.86, 19.05] },
    resourcesOffered: ["food", "water", "medicine"],
    isVerified: true,
  });

  await ResourceRequest.create({
    shelter: shelter._id,
    disaster: disaster._id,
    requestedBy: shelterStaff._id,
    resourceType: "food",
    quantity: 100,
    unit: "packets",
    priority: "critical",
    status: "open",
    description: "Urgent food packets for displaced families",
  });

  logger.info("Seed complete", {
    admin: admin.email,
    ngo: ngo.email,
    shelter: shelter.shelterName,
  });

  await disconnectDatabase();
  process.exit(0);
}

seed().catch((error) => {
  logger.error("Seed failed", { error });
  process.exit(1);
});
