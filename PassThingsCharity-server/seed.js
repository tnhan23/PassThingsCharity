require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Role = require('./models/role');
const User = require('./models/user');
const Organization = require('./models/organization');
const Station = require('./models/station');
const StationStaff = require('./models/stationstaff');
const ItemCategory = require('./models/itemCategory');
const ItemType = require('./models/itemType');
const Campaign = require('./models/campaign');
const CampaignItem = require('./models/campaignItem');
const CampaignStation = require('./models/campaignStation');
const PointTransaction = require('./models/pointTransaction');
const Achievement = require('./models/achievement');
const UserAchievement = require('./models/userAchievement');
const Certificate = require('./models/certificate');

// Password hash for '123456'
const TEST_PASSWORD_HASH = bcrypt.hashSync('123456', 12);

// Helper for upserting without modifying immutable _id
async function upsertDoc(Model, query, itemData) {
  const { _id, ...updateFields } = itemData;
  await Model.findOneAndUpdate(
    query,
    { $set: updateFields, $setOnInsert: { _id } },
    { upsert: true, returnDocument: 'after' }
  );
}

// 1. Roles
const rolesData = [
  { _id: new mongoose.Types.ObjectId("6523456789abcdef00000001"), name: "ADMIN", description: "Quản trị viên toàn quyền hệ thống" },
  { _id: new mongoose.Types.ObjectId("6523456789abcdef00000002"), name: "STATION_MANAGER", description: "Quản lý trạm tiếp nhận quyên góp" },
  { _id: new mongoose.Types.ObjectId("6523456789abcdef00000003"), name: "STAFF", description: "Nhân viên điều phối và xác nhận" },
  { _id: new mongoose.Types.ObjectId("6523456789abcdef00000004"), name: "VOLUNTEER", description: "Tình nguyện viên nhận nhiệm vụ" },
  { _id: new mongoose.Types.ObjectId("6523456789abcdef00000005"), name: "USER", description: "Người dùng đăng tải đồ quyên góp" }
];

// 2. Users
const usersData = [
  {
    _id: new mongoose.Types.ObjectId("6ac7b15a501de8a3e18592c9"),
    email: "admin@charity.com",
    username: "admin_system",
    password: TEST_PASSWORD_HASH,
    fullName: "Quản Trị Viên",
    role: new mongoose.Types.ObjectId("6523456789abcdef00000001"),
    status: "active",
    phone: "0965095788"
  },
  {
    _id: new mongoose.Types.ObjectId("6ac7b15a501de8a3e18592ca"),
    email: "user01@gmail.com",
    username: "nguoiquyengop_01",
    password: TEST_PASSWORD_HASH,
    fullName: "Người Quyên Góp (Station Manager)",
    role: new mongoose.Types.ObjectId("6523456789abcdef00000002"),
    status: "active",
    phone: "0949733882"
  },
  {
    _id: new mongoose.Types.ObjectId("6acbbb6a7faf5d01bb5261e4"),
    email: "staff-test@example.com",
    username: "staff_test_01",
    password: TEST_PASSWORD_HASH,
    fullName: "Staff Test",
    role: new mongoose.Types.ObjectId("6523456789abcdef00000003"),
    status: "active",
    phone: "0901234567"
  },
  {
    _id: new mongoose.Types.ObjectId("6acbbb6a7faf5d01bb5261e6"),
    email: "volunteer-test@example.com",
    username: "volunteer_test_01",
    password: TEST_PASSWORD_HASH,
    fullName: "Tình Nguyện Viên Test",
    role: new mongoose.Types.ObjectId("6523456789abcdef00000004"),
    status: "active",
    phone: "0912345679"
  },
  {
    _id: new mongoose.Types.ObjectId("6acbbb6a7faf5d01bb5261e7"),
    email: "user-test@example.com",
    username: "user_test_01",
    password: TEST_PASSWORD_HASH,
    fullName: "Người Dùng Test",
    role: new mongoose.Types.ObjectId("6523456789abcdef00000005"),
    status: "active",
    phone: "0987654321"
  }
];

// 3. Organization
const organizationsData = [
  {
    _id: new mongoose.Types.ObjectId("671000000000000000000001"),
    name: "Tổ Chức Cứu Trợ PassThingsCharity",
    code: "TEST-ORG-20261009-A",
    address: "123 Đường Nguyễn Huệ, Quận 1, TP.HCM",
    phone: "0912345678",
    email: "test-a@example.com",
    submittedBy: new mongoose.Types.ObjectId("6ac7b15a501de8a3e18592ca"),
    isVerified: true
  }
];

// 4. Station
const stationsData = [
  {
    _id: new mongoose.Types.ObjectId("671000000000000000000011"),
    organizationId: new mongoose.Types.ObjectId("671000000000000000000001"),
    name: "Trạm Tiếp Nhận Trung Tâm 01",
    address: "456 Đường Lê Lợi, Quận 1, TP.HCM",
    isActive: true
  }
];

// 5. StationStaff
const stationStaffsData = [
  {
    _id: new mongoose.Types.ObjectId("6acbbb6a7faf5d01bb5261e5"),
    stationId: new mongoose.Types.ObjectId("671000000000000000000011"),
    userId: new mongoose.Types.ObjectId("6acbbb6a7faf5d01bb5261e4")
  }
];

// 6. Item Categories
const categoriesData = [
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000101"),
    name: "Quần Áo",
    description: "Các loại áo thun, áo sơ mi, quần, chăn mền",
    isActive: true
  },
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000102"),
    name: "Thực Phẩm",
    description: "Mì gói, sữa, đồ hộp, thực phẩm khô",
    isActive: true
  },
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000103"),
    name: "Đồ Sinh Hoạt",
    description: "Xà phòng, bàn chải, khăn mặt",
    isActive: true
  }
];

// 7. Item Types
const itemTypesData = [
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000201"),
    categoryId: new mongoose.Types.ObjectId("6523456789abcdef00000101"),
    name: "Áo Thun Nam / Nữ",
    unit: "KG",
    description: "Áo thun tính theo KG",
    isActive: true
  },
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000202"),
    categoryId: new mongoose.Types.ObjectId("6523456789abcdef00000102"),
    name: "Mì Gói Cứu Trợ",
    unit: "BOX",
    description: "Mì gói theo thùng",
    isActive: true
  },
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000203"),
    categoryId: new mongoose.Types.ObjectId("6523456789abcdef00000102"),
    name: "Sữa Hộp Đóng Thùng",
    unit: "BOX",
    description: "Sữa tươi đóng thùng",
    isActive: true
  }
];

// 8. Campaign
const campaignsData = [
  {
    _id: new mongoose.Types.ObjectId("6acdef2e9fc3bf0d61d9d00b"),
    title: "Cứu trợ lũ lụt Miền Trung 2026",
    description: "Chiến dịch quyên góp vật phẩm khẩn cấp 7 ngày hỗ trợ đồng bào bão lũ",
    startDate: new Date("2026-10-15T00:00:00.000Z"),
    endDate: new Date("2026-10-22T23:59:59.000Z"),
    status: "ACTIVE",
    organizationId: new mongoose.Types.ObjectId("671000000000000000000001"),
    createdBy: new mongoose.Types.ObjectId("6ac7b15a501de8a3e18592c9")
  }
];

// 9. Campaign Items
const campaignItemsData = [
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000401"),
    campaignId: new mongoose.Types.ObjectId("6acdef2e9fc3bf0d61d9d00b"),
    itemTypeId: new mongoose.Types.ObjectId("6523456789abcdef00000202"),
    targetQuantity: 500,
    currentQuantity: 120,
    priority: "HIGH"
  },
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000402"),
    campaignId: new mongoose.Types.ObjectId("6acdef2e9fc3bf0d61d9d00b"),
    itemTypeId: new mongoose.Types.ObjectId("6523456789abcdef00000201"),
    targetQuantity: 200,
    currentQuantity: 45,
    priority: "MEDIUM"
  }
];

// 10. Campaign Stations
const campaignStationsData = [
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000501"),
    campaignId: new mongoose.Types.ObjectId("6acdef2e9fc3bf0d61d9d00b"),
    stationId: new mongoose.Types.ObjectId("671000000000000000000011"),
    assignedAt: new Date()
  }
];

// 11. Point Transactions
const pointTransactionsData = [
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000601"),
    userId: new mongoose.Types.ObjectId("6ac7b15a501de8a3e18592ca"),
    points: 100,
    type: "DONATION",
    description: "Thưởng quyên góp 10 thùng mì gói cho chiến dịch Miền Trung"
  },
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000602"),
    userId: new mongoose.Types.ObjectId("6acbbb6a7faf5d01bb5261e6"),
    points: 50,
    type: "VOLUNTEER_TASK",
    description: "Thưởng hoàn thành nhiệm vụ phân loại quần áo cứu trợ"
  }
];

// 12. Achievements
const achievementsData = [
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000301"),
    title: "Người Nhân Ái Khởi Đầu",
    description: "Hoàn thành 1 lần đóng góp quyên góp thành công",
    criteriaType: "DONATION_COUNT",
    criteriaValue: 1,
    pointsReward: 50,
    isActive: true
  },
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000302"),
    title: "Tình Nguyện Viên Năng Nổ",
    description: "Tích lũy đạt 50 điểm thưởng",
    criteriaType: "POINTS_ACCUMULATED",
    criteriaValue: 50,
    pointsReward: 100,
    isActive: true
  }
];

// 13. User Achievements
const userAchievementsData = [
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000701"),
    userId: new mongoose.Types.ObjectId("6ac7b15a501de8a3e18592ca"),
    achievementId: new mongoose.Types.ObjectId("6523456789abcdef00000301"),
    unlockedAt: new Date()
  }
];

// 14. Certificates
const certificatesData = [
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000801"),
    userId: new mongoose.Types.ObjectId("6ac7b15a501de8a3e18592ca"),
    campaignId: new mongoose.Types.ObjectId("6acdef2e9fc3bf0d61d9d00b"),
    certificateType: "DONOR",
    title: "Giấy Chứng Nhận Tấm Lòng Vàng 2026",
    content: "Tuyên dương thành tích xuất sắc đóng góp quyên góp hàng cứu trợ cho đồng bào bão lũ Miền Trung",
    issueDate: new Date()
  }
];

async function seedAll() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log(`[Seed All] Connecting to Cloud Atlas: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    console.log('[Seed] 1/14 Roles...');
    for (const item of rolesData) await upsertDoc(Role, { _id: item._id }, item);

    console.log('[Seed] 2/14 Users...');
    for (const item of usersData) await upsertDoc(User, { _id: item._id }, item);

    console.log('[Seed] 3/14 Organizations...');
    for (const item of organizationsData) await upsertDoc(Organization, { _id: item._id }, item);

    console.log('[Seed] 4/14 Stations...');
    for (const item of stationsData) await upsertDoc(Station, { _id: item._id }, item);

    console.log('[Seed] 5/14 StationStaffs...');
    for (const item of stationStaffsData) await upsertDoc(StationStaff, { stationId: item.stationId, userId: item.userId }, item);

    console.log('[Seed] 6/14 Item Categories...');
    for (const item of categoriesData) await upsertDoc(ItemCategory, { _id: item._id }, item);

    console.log('[Seed] 7/14 Item Types...');
    for (const item of itemTypesData) await upsertDoc(ItemType, { _id: item._id }, item);

    console.log('[Seed] 8/14 Campaigns...');
    for (const item of campaignsData) await upsertDoc(Campaign, { _id: item._id }, item);

    console.log('[Seed] 9/14 Campaign Items...');
    for (const item of campaignItemsData) await upsertDoc(CampaignItem, { campaignId: item.campaignId, itemTypeId: item.itemTypeId }, item);

    console.log('[Seed] 10/14 Campaign Stations...');
    for (const item of campaignStationsData) await upsertDoc(CampaignStation, { campaignId: item.campaignId, stationId: item.stationId }, item);

    console.log('[Seed] 11/14 Point Transactions...');
    for (const item of pointTransactionsData) await upsertDoc(PointTransaction, { _id: item._id }, item);

    console.log('[Seed] 12/14 Achievements...');
    for (const item of achievementsData) await upsertDoc(Achievement, { _id: item._id }, item);

    console.log('[Seed] 13/14 User Achievements...');
    for (const item of userAchievementsData) await upsertDoc(UserAchievement, { userId: item.userId, achievementId: item.achievementId }, item);

    console.log('[Seed] 14/14 Certificates...');
    for (const item of certificatesData) await upsertDoc(Certificate, { _id: item._id }, item);

    console.log('===========================================================');
    console.log('🎉 SEEDED ALL 14 COLLECTIONS TO MONGODB ATLAS CLOUD SUCCESSFULLY!');
    console.log('===========================================================');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('[Seed] Disconnected from MongoDB Atlas.');
  }
}

seedAll();
