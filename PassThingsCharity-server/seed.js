require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Role = require('./models/role');
const User = require('./models/user');
const Organization = require('./models/organization');
const Station = require('./models/station');
const StationStaff = require('./models/stationstaff');

// Mật khẩu test chung cho tất cả các tài khoản: 123456
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync('123456', 12);

const rolesData = [
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000001"),
    name: "ADMIN",
    description: "Quản trị viên toàn quyền hệ thống"
  },
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000002"),
    name: "STATION_MANAGER",
    description: "Quản lý trạm tiếp nhận quyên góp"
  },
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000003"),
    name: "STAFF",
    description: "Nhân viên điều phối và xác nhận"
  },
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000004"),
    name: "VOLUNTEER",
    description: "Tình nguyện viên nhận nhiệm vụ"
  },
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000005"),
    name: "USER",
    description: "Người dùng đăng tải đồ quyên góp"
  }
];

const usersData = [
  {
    _id: new mongoose.Types.ObjectId("6ac7b15a501de8a3e18592c9"),
    email: "admin@charity.com",
    username: "admin_system",
    password: DEFAULT_PASSWORD_HASH,
    fullName: "Quản Trị Viên",
    role: new mongoose.Types.ObjectId("6523456789abcdef00000001"), // ADMIN
    status: "active",
    phone: "0965095788",
    createdAt: new Date("2026-10-08T00:00:00.000Z"),
    updatedAt: new Date("2026-10-08T00:00:00.000Z")
  },
  {
    _id: new mongoose.Types.ObjectId("6ac7b15a501de8a3e18592ca"),
    email: "user01@gmail.com",
    username: "nguoiquyengop_01",
    password: DEFAULT_PASSWORD_HASH,
    fullName: "Người Quyên Góp (Station Manager)",
    role: new mongoose.Types.ObjectId("6523456789abcdef00000002"), // STATION_MANAGER
    status: "active",
    phone: "0949733882",
    createdAt: new Date("2026-10-08T00:00:00.000Z"),
    updatedAt: new Date("2026-10-09T16:09:17.531Z")
  },
  {
    _id: new mongoose.Types.ObjectId("6acbbb6a7faf5d01bb5261e4"),
    email: "staff-test@example.com",
    username: "staff_test_01",
    password: DEFAULT_PASSWORD_HASH,
    fullName: "Staff Test",
    role: new mongoose.Types.ObjectId("6523456789abcdef00000003"), // STAFF
    status: "active",
    phone: "0901234567",
    createdAt: new Date("2026-10-11T16:38:02.417Z"),
    updatedAt: new Date("2026-10-11T16:38:02.417Z")
  },
  {
    _id: new mongoose.Types.ObjectId("6acbbb6a7faf5d01bb5261e6"),
    email: "volunteer-test@example.com",
    username: "volunteer_test_01",
    password: DEFAULT_PASSWORD_HASH,
    fullName: "Tình Nguyện Viên Test",
    role: new mongoose.Types.ObjectId("6523456789abcdef00000004"), // VOLUNTEER
    status: "active",
    phone: "0912345679",
    createdAt: new Date("2026-10-11T16:38:02.417Z"),
    updatedAt: new Date("2026-10-11T16:38:02.417Z")
  },
  {
    _id: new mongoose.Types.ObjectId("6acbbb6a7faf5d01bb5261e7"),
    email: "user-test@example.com",
    username: "user_test_01",
    password: DEFAULT_PASSWORD_HASH,
    fullName: "Người Dùng Test",
    role: new mongoose.Types.ObjectId("6523456789abcdef00000005"), // USER
    status: "active",
    phone: "0987654321",
    createdAt: new Date("2026-10-11T16:38:02.417Z"),
    updatedAt: new Date("2026-10-11T16:38:02.417Z")
  }
];

const organizationsData = [
  {
    _id: new mongoose.Types.ObjectId("671000000000000000000001"),
    name: "Nhom tu thien test A",
    code: "TEST-ORG-20261009-A",
    address: "Dia chi to chuc test A",
    phone: "0912345678",
    email: "test-a@example.com",
    submittedBy: new mongoose.Types.ObjectId("6ac7b15a501de8a3e18592ca"),
    isVerified: true,
    createdAt: new Date("2026-10-09T16:15:00.000Z"),
    updatedAt: new Date("2026-10-10T03:47:29.648Z")
  },
  {
    _id: new mongoose.Types.ObjectId("6ac9ba1d4e5e0494abf11158"),
    name: "Nhóm từ thiện test A",
    code: "TEST-ORG-20261010-A",
    address: "Địa chỉ tổ chức test A",
    phone: "0912345678",
    email: "test-a@example.com",
    submittedBy: new mongoose.Types.ObjectId("6ac7b15a501de8a3e18592ca"),
    isVerified: false,
    createdAt: new Date("2026-10-10T04:07:57.003Z"),
    updatedAt: new Date("2026-10-10T04:07:57.003Z")
  }
];

const stationsData = [
  {
    _id: new mongoose.Types.ObjectId("671000000000000000000011"),
    organizationId: new mongoose.Types.ObjectId("671000000000000000000001"),
    name: "Diem tiep nhan test A",
    address: "Dia chi tram test A",
    isActive: true,
    createdAt: new Date("2026-10-09T16:15:00.000Z"),
    updatedAt: new Date("2026-10-10T03:48:14.548Z")
  }
];

const stationStaffsData = [
  {
    _id: new mongoose.Types.ObjectId("6acbbb6a7faf5d01bb5261e5"),
    stationId: new mongoose.Types.ObjectId("671000000000000000000011"),
    userId: new mongoose.Types.ObjectId("6acbbb6a7faf5d01bb5261e4"),
    assignedAt: new Date("2026-10-11T16:38:02.422Z")
  }
];

async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/Passthingscharity';
    console.log(`[Seed] Connecting to MongoDB: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    console.log('[Seed] Seeding Roles...');
    for (const item of rolesData) {
      await Role.findOneAndUpdate({ _id: item._id }, item, { upsert: true, returnDocument: 'after' });
    }

    console.log('[Seed] Seeding Users with test password: "123456"...');
    for (const item of usersData) {
      await User.findOneAndUpdate({ _id: item._id }, item, { upsert: true, returnDocument: 'after' });
    }

    console.log('[Seed] Seeding Organizations...');
    for (const item of organizationsData) {
      await Organization.findOneAndUpdate({ _id: item._id }, item, { upsert: true, returnDocument: 'after' });
    }

    console.log('[Seed] Seeding Stations...');
    for (const item of stationsData) {
      await Station.findOneAndUpdate({ _id: item._id }, item, { upsert: true, returnDocument: 'after' });
    }

    console.log('[Seed] Seeding StationStaffs...');
    for (const item of stationStaffsData) {
      await StationStaff.findOneAndUpdate({ _id: item._id }, item, { upsert: true, returnDocument: 'after' });
    }

    console.log('==================================================');
    console.log('✅ SEED DATABASE COMPLETED SUCCESSFULLY!');
    console.log('Mật khẩu đăng nhập cho tất cả tài khoản là: 123456');
    console.log('==================================================');
  } catch (error) {
    console.error('❌ Error during database seed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('[Seed] Disconnected from MongoDB.');
  }
}

seed();
