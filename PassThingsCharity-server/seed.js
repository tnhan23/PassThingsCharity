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

// BE3 Models
const Contribution = require('./models/contribution');
const ContributionItem = require('./models/contributionItem');
const ContributionImage = require('./models/contributionImage');
const CampaignTransfer = require('./models/campaignTransfer');
const CampaignTransferItem = require('./models/campaignTransferItem');
const ReliefDistribution = require('./models/reliefDistribution');
const ReliefDistributionItem = require('./models/reliefDistributionItem');
const VolunteerRegistration = require('./models/volunteerRegistration');
const Task = require('./models/task');
const TaskAssignment = require('./models/taskAssignment');
const TaskApplication = require('./models/taskApplication');

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
  { _id: new mongoose.Types.ObjectId("6523456789abcdef00000006"), name: "ORG_MANAGER", description: "Quản lý tổ chức từ thiện" },
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

// 4. Stations (Comprehensive GPS stations across TP.HCM)
const stationsData = [
  {
    _id: new mongoose.Types.ObjectId("671000000000000000000011"),
    organizationId: new mongoose.Types.ObjectId("671000000000000000000001"),
    name: "Trạm Tiếp Nhận Trung Tâm 01 (Quận 1)",
    address: "456 Đường Lê Lợi, Quận 1, TP.HCM",
    latitude: "10.776889",
    longitude: "106.700806",
    openingTime: "08:00",
    closingTime: "17:00",
    isActive: true
  },
  {
    _id: new mongoose.Types.ObjectId("671000000000000000000012"),
    organizationId: new mongoose.Types.ObjectId("671000000000000000000001"),
    name: "Trạm Tiếp Nhận Quận 5",
    address: "789 Đường An Dương Vương, Quận 5, TP.HCM",
    latitude: "10.758889",
    longitude: "106.666806",
    openingTime: "08:00",
    closingTime: "17:00",
    isActive: true
  },
  {
    _id: new mongoose.Types.ObjectId("671000000000000000000013"),
    organizationId: new mongoose.Types.ObjectId("671000000000000000000001"),
    name: "Trạm Tiếp Nhận Quận 3",
    address: "280 Nam Kỳ Khởi Nghĩa, Quận 3, TP.HCM",
    latitude: "10.787800",
    longitude: "106.688100",
    openingTime: "08:00",
    closingTime: "17:00",
    isActive: true
  },
  {
    _id: new mongoose.Types.ObjectId("671000000000000000000014"),
    organizationId: new mongoose.Types.ObjectId("671000000000000000000001"),
    name: "Trạm Tiếp Nhận Quận 7",
    address: "1058 Nguyễn Văn Linh, Quận 7, TP.HCM",
    latitude: "10.729800",
    longitude: "106.702200",
    openingTime: "08:00",
    closingTime: "17:00",
    isActive: true
  },
  {
    _id: new mongoose.Types.ObjectId("671000000000000000000015"),
    organizationId: new mongoose.Types.ObjectId("671000000000000000000001"),
    name: "Trạm Tiếp Nhận Bình Thạnh",
    address: "49 Đinh Bộ Lĩnh, Quận Bình Thạnh, TP.HCM",
    latitude: "10.803800",
    longitude: "106.711800",
    openingTime: "08:00",
    closingTime: "17:00",
    isActive: true
  },
  {
    _id: new mongoose.Types.ObjectId("671000000000000000000016"),
    organizationId: new mongoose.Types.ObjectId("671000000000000000000001"),
    name: "Trạm Tiếp Nhận Gò Vấp",
    address: "12 Nguyễn Văn Bảo, Quận Gò Vấp, TP.HCM",
    latitude: "10.822200",
    longitude: "106.687200",
    openingTime: "08:00",
    closingTime: "17:00",
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

// 10. Campaign Stations (Multi-station coverage for Map Testing)
const campaignStationsData = [
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000501"),
    campaignId: new mongoose.Types.ObjectId("6acdef2e9fc3bf0d61d9d00b"),
    stationId: new mongoose.Types.ObjectId("671000000000000000000011"),
    assignedAt: new Date()
  },
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000502"),
    campaignId: new mongoose.Types.ObjectId("6acdef2e9fc3bf0d61d9d00b"),
    stationId: new mongoose.Types.ObjectId("6ad5fa91793cb88b3338723d"),
    assignedAt: new Date()
  },
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000503"),
    campaignId: new mongoose.Types.ObjectId("6acdef2e9fc3bf0d61d9d00b"),
    stationId: new mongoose.Types.ObjectId("671000000000000000000012"),
    assignedAt: new Date()
  },
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000504"),
    campaignId: new mongoose.Types.ObjectId("6acdef2e9fc3bf0d61d9d00b"),
    stationId: new mongoose.Types.ObjectId("671000000000000000000013"),
    assignedAt: new Date()
  },
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000505"),
    campaignId: new mongoose.Types.ObjectId("6acdef2e9fc3bf0d61d9d00b"),
    stationId: new mongoose.Types.ObjectId("671000000000000000000014"),
    assignedAt: new Date()
  },
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000506"),
    campaignId: new mongoose.Types.ObjectId("6acdef2e9fc3bf0d61d9d00b"),
    stationId: new mongoose.Types.ObjectId("671000000000000000000015"),
    assignedAt: new Date()
  },
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000507"),
    campaignId: new mongoose.Types.ObjectId("6acdef2e9fc3bf0d61d9d00b"),
    stationId: new mongoose.Types.ObjectId("671000000000000000000016"),
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

// 15. Contributions (Inbound)
const contributionsData = [
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000a01"),
    code: "CTB-20261015-0001",
    userId: new mongoose.Types.ObjectId("6acbbb6a7faf5d01bb5261e7"),
    stationId: new mongoose.Types.ObjectId("671000000000000000000011"),
    campaignId: new mongoose.Types.ObjectId("6acdef2e9fc3bf0d61d9d00b"),
    staffId: new mongoose.Types.ObjectId("6acbbb6a7faf5d01bb5261e4"),
    status: "ACCEPTED",
    notes: "Quyên góp 10 thùng mì và 20kg quần áo ấm",
    createdAt: new Date()
  }
];

// 16. Contribution Items
const contributionItemsData = [
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000b01"),
    contributionId: new mongoose.Types.ObjectId("6523456789abcdef00000a01"),
    campaignItemId: new mongoose.Types.ObjectId("6523456789abcdef00000401"),
    itemTypeId: new mongoose.Types.ObjectId("6523456789abcdef00000202"),
    quantity: 10,
    unit: "BOX",
    note: "10 thùng mì Hảo Hảo còn nguyên bao bì"
  },
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000b02"),
    contributionId: new mongoose.Types.ObjectId("6523456789abcdef00000a01"),
    campaignItemId: new mongoose.Types.ObjectId("6523456789abcdef00000402"),
    itemTypeId: new mongoose.Types.ObjectId("6523456789abcdef00000201"),
    quantity: 20,
    unit: "KG",
    note: "Quần áo thun và áo ấm sạch sẽ"
  }
];

// 17. Contribution Images
const contributionImagesData = [
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000c01"),
    contributionId: new mongoose.Types.ObjectId("6523456789abcdef00000a01"),
    imageUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c"
  }
];

// 18. Campaign Transfers (Inter-Station)
const transfersData = [
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000d01"),
    code: "TRF-20261015-0001",
    campaignId: new mongoose.Types.ObjectId("6acdef2e9fc3bf0d61d9d00b"),
    fromStationId: new mongoose.Types.ObjectId("671000000000000000000011"),
    toStationId: new mongoose.Types.ObjectId("671000000000000000000012"),
    status: "IN_TRANSIT",
    createdBy: new mongoose.Types.ObjectId("6acbbb6a7faf5d01bb5261e4"),
    responsibleUserId: new mongoose.Types.ObjectId("6acbbb6a7faf5d01bb5261e4"),
    transportMethod: "Xe tải 2.5 tấn",
    transportNote: "Xe tải chuyển 50 thùng mì sang trạm Quận 5 để tập kết"
  }
];

// 19. Campaign Transfer Items
const transferItemsData = [
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000e01"),
    transferId: new mongoose.Types.ObjectId("6523456789abcdef00000d01"),
    itemTypeId: new mongoose.Types.ObjectId("6523456789abcdef00000202"),
    quantity: 50,
    unit: "BOX"
  }
];

// 20. Relief Distributions (Outbound)
const reliefDistributionsData = [
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00000f01"),
    code: "DST-20261015-0001",
    campaignId: new mongoose.Types.ObjectId("6acdef2e9fc3bf0d61d9d00b"),
    stationId: new mongoose.Types.ObjectId("671000000000000000000011"),
    recipientName: "Ông Nguyễn Văn B",
    recipientRole: "Chủ tịch Ủy ban MTTQ Xã",
    recipientPhone: "0988776655",
    recipientAddress: "UBND Xã Lộc An, Huyện Phú Lộc, Thừa Thiên Huế",
    distributionDate: new Date("2026-10-20T10:00:00.000Z"),
    status: "PLANNED",
    notes: "Bàn giao đợt 1 trực tiếp cho chính quyền địa phương",
    handledBy: new mongoose.Types.ObjectId("6acbbb6a7faf5d01bb5261e4")
  }
];

// 21. Relief Distribution Items
const reliefDistributionItemsData = [
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00001001"),
    distributionId: new mongoose.Types.ObjectId("6523456789abcdef00000f01"),
    itemTypeId: new mongoose.Types.ObjectId("6523456789abcdef00000202"),
    quantity: 100,
    unit: "BOX"
  }
];

// 22. Volunteer Registrations
const volunteerRegistrationsData = [
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00001101"),
    campaignId: new mongoose.Types.ObjectId("6acdef2e9fc3bf0d61d9d00b"),
    userId: new mongoose.Types.ObjectId("6acbbb6a7faf5d01bb5261e6"),
    status: "APPROVED",
    registeredAt: new Date(),
    approvedBy: new mongoose.Types.ObjectId("6ac7b15a501de8a3e18592c9"),
    note: "Có thể tham gia hỗ trợ khuân vác và phân loại hàng"
  }
];

// 23. Tasks
const tasksData = [
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00001201"),
    campaignId: new mongoose.Types.ObjectId("6acdef2e9fc3bf0d61d9d00b"),
    stationId: new mongoose.Types.ObjectId("671000000000000000000011"),
    transferId: new mongoose.Types.ObjectId("6523456789abcdef00000d01"),
    title: "Phân loại và đóng thùng quần áo ấm đợt 1",
    description: "Phân loại đồ nam, nữ, trẻ em và cân theo kiện 10kg",
    startTime: new Date("2026-10-16T08:00:00.000Z"),
    endTime: new Date("2026-10-16T12:00:00.000Z"),
    status: "IN_PROGRESS",
    recruitmentStatus: "OPEN",
    requiredVolunteers: 5,
    volunteerDeadline: new Date("2026-10-16T07:00:00.000Z"),
    rewardPoints: 50,
    createdBy: new mongoose.Types.ObjectId("6acbbb6a7faf5d01bb5261e4")
  }
];

// 24. Task Assignments
const taskAssignmentsData = [
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00001301"),
    taskId: new mongoose.Types.ObjectId("6523456789abcdef00001201"),
    assigneeId: new mongoose.Types.ObjectId("6acbbb6a7faf5d01bb5261e6"),
    assigneeType: "VOLUNTEER",
    assignedBy: new mongoose.Types.ObjectId("6acbbb6a7faf5d01bb5261e4"),
    assignedAt: new Date(),
    hoursSpent: 4,
    completionNote: "Đã phân loại xong 15 kiện đồ",
    checkInTime: new Date("2026-10-16T08:00:00.000Z"),
    status: "IN_PROGRESS"
  }
];

// 25. Task Applications
const taskApplicationsData = [
  {
    _id: new mongoose.Types.ObjectId("6523456789abcdef00001401"),
    taskId: new mongoose.Types.ObjectId("6523456789abcdef00001201"),
    userId: new mongoose.Types.ObjectId("6acbbb6a7faf5d01bb5261e7"),
    status: "PENDING",
    appliedAt: new Date(),
    note: "Em muốn tham gia hỗ trợ phân loại quần áo đợt này ạ"
  }
];

async function seedAll() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log(`[Seed All] Connecting to Cloud Atlas: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    console.log('[Seed] 1/25 Roles...');
    for (const item of rolesData) await upsertDoc(Role, { name: item.name }, item);

    console.log('[Seed] 2/25 Users...');
    for (const item of usersData) await upsertDoc(User, { username: item.username }, item);

    console.log('[Seed] 3/25 Organizations...');
    for (const item of organizationsData) await upsertDoc(Organization, { code: item.code }, item);

    console.log('[Seed] 4/25 Stations...');
    for (const item of stationsData) await upsertDoc(Station, { _id: item._id }, item);

    console.log('[Seed] 5/25 StationStaffs...');
    for (const item of stationStaffsData) await upsertDoc(StationStaff, { stationId: item.stationId, userId: item.userId }, item);

    console.log('[Seed] 6/25 Item Categories...');
    for (const item of categoriesData) await upsertDoc(ItemCategory, { _id: item._id }, item);

    console.log('[Seed] 7/25 Item Types...');
    for (const item of itemTypesData) await upsertDoc(ItemType, { _id: item._id }, item);

    console.log('[Seed] 8/25 Campaigns...');
    for (const item of campaignsData) await upsertDoc(Campaign, { _id: item._id }, item);

    console.log('[Seed] 9/25 Campaign Items...');
    for (const item of campaignItemsData) await upsertDoc(CampaignItem, { campaignId: item.campaignId, itemTypeId: item.itemTypeId }, item);

    console.log('[Seed] 10/25 Campaign Stations...');
    for (const item of campaignStationsData) await upsertDoc(CampaignStation, { campaignId: item.campaignId, stationId: item.stationId }, item);

    console.log('[Seed] 11/25 Point Transactions...');
    for (const item of pointTransactionsData) await upsertDoc(PointTransaction, { _id: item._id }, item);

    console.log('[Seed] 12/25 Achievements...');
    for (const item of achievementsData) await upsertDoc(Achievement, { _id: item._id }, item);

    console.log('[Seed] 13/25 User Achievements...');
    for (const item of userAchievementsData) await upsertDoc(UserAchievement, { userId: item.userId, achievementId: item.achievementId }, item);

    console.log('[Seed] 14/25 Certificates...');
    for (const item of certificatesData) await upsertDoc(Certificate, { _id: item._id }, item);

    // BE3 Seed Execution
    console.log('[Seed] 15/25 Contributions...');
    for (const item of contributionsData) await upsertDoc(Contribution, { _id: item._id }, item);

    console.log('[Seed] 16/25 Contribution Items...');
    for (const item of contributionItemsData) await upsertDoc(ContributionItem, { _id: item._id }, item);

    console.log('[Seed] 17/25 Contribution Images...');
    for (const item of contributionImagesData) await upsertDoc(ContributionImage, { _id: item._id }, item);

    console.log('[Seed] 18/25 Campaign Transfers...');
    for (const item of transfersData) await upsertDoc(CampaignTransfer, { _id: item._id }, item);

    console.log('[Seed] 19/25 Campaign Transfer Items...');
    for (const item of transferItemsData) await upsertDoc(CampaignTransferItem, { _id: item._id }, item);

    console.log('[Seed] 20/25 Relief Distributions...');
    for (const item of reliefDistributionsData) await upsertDoc(ReliefDistribution, { _id: item._id }, item);

    console.log('[Seed] 21/25 Relief Distribution Items...');
    for (const item of reliefDistributionItemsData) await upsertDoc(ReliefDistributionItem, { _id: item._id }, item);

    console.log('[Seed] 22/25 Volunteer Registrations...');
    for (const item of volunteerRegistrationsData) await upsertDoc(VolunteerRegistration, { campaignId: item.campaignId, userId: item.userId }, item);

    console.log('[Seed] 23/25 Tasks...');
    for (const item of tasksData) await upsertDoc(Task, { _id: item._id }, item);

    console.log('[Seed] 24/25 Task Assignments...');
    for (const item of taskAssignmentsData) await upsertDoc(TaskAssignment, { taskId: item.taskId, assigneeId: item.assigneeId }, item);

    console.log('[Seed] 25/25 Task Applications...');
    for (const item of taskApplicationsData) await upsertDoc(TaskApplication, { taskId: item.taskId, userId: item.userId }, item);

    console.log('===========================================================');
    console.log('🎉 SEEDED ALL 25 COLLECTIONS TO MONGODB ATLAS CLOUD SUCCESSFULLY!');
    console.log('===========================================================');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('[Seed] Disconnected from MongoDB Atlas.');
  }
}

seedAll();
