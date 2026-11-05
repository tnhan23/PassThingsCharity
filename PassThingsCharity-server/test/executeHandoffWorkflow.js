require('dotenv').config();
const mongoose = require('mongoose');

const Role = require('../models/role');
const User = require('../models/user');
const Admin = require('../models/admin');
const Organization = require('../models/organization');
const Station = require('../models/station');
const StationStaff = require('../models/stationstaff');
const ItemCategory = require('../models/itemCategory');
const ItemType = require('../models/itemType');
const Campaign = require('../models/campaign');
const CampaignItem = require('../models/campaignItem');
const CampaignStation = require('../models/campaignStation');
const Inventory = require('../models/inventory');
const CampaignTransfer = require('../models/campaignTransfer');
const CampaignTransferItem = require('../models/campaignTransferItem');
const Task = require('../models/task');
const TaskAssignment = require('../models/taskAssignment');
const TransferEvidenceUpload = require('../models/transferEvidenceUpload');
const Contribution = require('../models/contribution');
const ContributionItem = require('../models/contributionItem');

const transferWorkflow = require('../services/transferWorkflow');
const campaignResults = require('../controller/campaignResults');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('================================================================');
  console.log('🚀 EXECUTION OF HANDOFF WORKFLOW: INTER-STATION TRANSFER & RESULTS');
  console.log('================================================================');

  // 1. Fetch Users & Managers
  const adminUser = await User.findOne({ username: 'admin_system' }).populate('role');
  const stationManagerA = await User.findOne({ username: 'nguoiquyengop_01' }).populate('role') || adminUser;
  const stationManagerB = await User.findOne({ username: 'manager_thuduc' }).populate('role') || adminUser;
  const driverUser = await User.findOne({ username: 'user_test_01' }).populate('role');

  // Station A (Quận 1) & Station B (Quận 5)
  const stationA_Id = new mongoose.Types.ObjectId('671000000000000000000011');
  const stationB_Id = new mongoose.Types.ObjectId('671000000000000000000012');

  // Ensure station managers are set
  await Station.updateOne({ _id: stationA_Id }, { $set: { managerId: stationManagerA._id } });
  await Station.updateOne({ _id: stationB_Id }, { $set: { managerId: stationManagerB._id } });

  // 2. Setup Active Campaign
  let campaign = await Campaign.findOne({ title: 'Chiến dịch Test Vận Chuyển Handoff 2026' });
  if (!campaign) {
    campaign = await Campaign.create({
      title: 'Chiến dịch Test Vận Chuyển Handoff 2026',
      description: 'Chiến dịch thử nghiệm vận chuyển liên trạm và tổng kết kết quả',
      startDate: new Date(),
      endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      organizationId: new mongoose.Types.ObjectId('671000000000000000000001'),
      createdBy: adminUser._id,
    });
  } else {
    campaign.status = 'ACTIVE';
    await campaign.save();
  }

  const campaignId = campaign._id;

  await CampaignStation.findOneAndUpdate(
    { campaignId, stationId: stationA_Id },
    { $set: { campaignId, stationId: stationA_Id } },
    { upsert: true }
  );

  await CampaignStation.findOneAndUpdate(
    { campaignId, stationId: stationB_Id },
    { $set: { campaignId, stationId: stationB_Id } },
    { upsert: true }
  );

  const itemType = await ItemType.findById('6523456789abcdef00000202');
  const itemTypeId = itemType._id;

  await CampaignItem.findOneAndUpdate(
    { campaignId, itemTypeId },
    { $set: { campaignId, itemTypeId, targetQuantity: 1000, priority: 'HIGH' } },
    { upsert: true }
  );

  // Record a Contribution so collectedQuantity >= 50
  let contribution = await Contribution.findOne({ campaignId });
  if (!contribution) {
    contribution = await Contribution.create({
      code: `CTB-${Date.now().toString().slice(-6)}`,
      campaignId,
      stationId: stationA_Id,
      userId: driverUser._id,
      staffId: stationManagerA._id,
      status: 'COMPLETED',
      notes: 'Quyên góp đầu đợt cho chiến dịch',
    });
    await ContributionItem.create({
      contributionId: contribution._id,
      itemTypeId,
      quantity: 50,
      unit: 'BOX',
    });
  }

  // 3. Stock Inventory at Station A
  let invA = await Inventory.findOne({ stationId: stationA_Id, itemTypeId });
  if (!invA) {
    invA = await Inventory.create({
      stationId: stationA_Id,
      itemTypeId,
      unit: 'BOX',
      quantity: 100,
    });
  } else {
    invA.quantity = Math.max(invA.quantity, 100);
    await invA.save();
  }

  let invB = await Inventory.findOne({ stationId: stationB_Id, itemTypeId });
  if (!invB) {
    invB = await Inventory.create({
      stationId: stationB_Id,
      itemTypeId,
      unit: 'BOX',
      quantity: 0,
    });
  }

  console.log(`\n📌 [BAN ĐẦU] Kho Trạm A (Quận 1): Tồn=${invA.quantity} BOX Mì tôm`);
  console.log(`📌 [BAN ĐẦU] Kho Trạm B (Quận 5): Tồn=${invB.quantity} BOX Mì tôm`);

  // STEP 1 & 3: POST /transfers (Tạo phiếu chuyển kho 50 thùng mì)
  const transfer = await CampaignTransfer.create({
    code: `TRF-${Date.now().toString().slice(-6)}`,
    campaignId,
    fromStationId: stationA_Id,
    toStationId: stationB_Id,
    createdBy: stationManagerA._id,
    transportMethod: 'Xe tải 2.5 tấn - 51C-12345',
    transportNote: 'Chuyển 50 thùng mì tôm từ A sang B',
    workflowVersion: 2,
    approvalStatus: 'PENDING',
    status: 'PENDING',
  });

  const transferItem = await CampaignTransferItem.create({
    transferId: transfer._id,
    itemTypeId,
    quantity: 50,
    unit: 'BOX',
  });

  console.log(`\n✅ BƯỚC 1 & 3: [POST /transfers] Tạo phiếu chuyển kho thành công.`);
  console.log(`   - Transfer ID: ${transfer._id}`);
  console.log(`   - Transfer Code: ${transfer.code}`);
  console.log(`   - Transfer Item ID: ${transferItem._id} (50 BOX Mì tôm)`);

  // STEP 4: PATCH /transfers/{id}/approval (Duyệt phiếu - GIỮ CHỖ HÀNG)
  await transferWorkflow.approve(transfer, { decision: 'APPROVED' }, adminUser);
  console.log(`\n✅ BƯỚC 4: [PATCH /transfers/{id}/approval] Duyệt phiếu chuyển kho.`);

  // STEP 5: PATCH /transfers/{id}/responsibilities (Gán người phụ trách A & B)
  await transferWorkflow.assignResponsibilities(transfer, {
    responsibleUserId: stationManagerA._id.toString(),
    receivedBy: stationManagerB._id.toString(),
  }, adminUser);
  console.log(`\n✅ BƯỚC 5: [PATCH /transfers/{id}/responsibilities] Đã gán Phụ trách A (${stationManagerA.username}) & Phụ trách B (${stationManagerB.username}).`);

  // STEP 6: Workforce Task for Driver
  const task = await Task.create({
    campaignId,
    stationId: stationA_Id,
    transferId: transfer._id,
    title: `Chở 50 thùng mì tôm từ Trạm A sang Trạm B (${transfer.code})`,
    description: 'Vận chuyển hàng hóa liên trạm',
    startTime: new Date(),
    endTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
    recruitmentStatus: 'OPEN',
    requiredVolunteers: 1,
    rewardPoints: 50,
    createdBy: stationManagerA._id,
  });

  const assignment = await TaskAssignment.create({
    taskId: task._id,
    assigneeId: driverUser._id,
    assigneeType: 'VOLUNTEER',
    assignedBy: stationManagerA._id,
    status: 'ASSIGNED',
  });

  console.log(`\n✅ BƯỚC 6: [Tạo Task & Assignment] Gán nhiệm vụ vận chuyển cho tài xế (${driverUser.username}).`);
  console.log(`   - Task ID: ${task._id}`);
  console.log(`   - Assignment ID: ${assignment._id}`);

  // STEP 7: Check-in Task
  assignment.status = 'IN_PROGRESS';
  assignment.checkInTime = new Date();
  await assignment.save();
  console.log(`\n✅ BƯỚC 7: [POST /workforce/tasks/check-in] Tài xế đã Check-in nhiệm vụ.`);

  // STEP 8: Create Shipment (Allocate)
  const shipment = await transferWorkflow.allocate(transfer, {
    assignmentId: assignment._id,
    items: [{ transferItemId: transferItem._id, quantity: 50 }],
  }, stationManagerA);

  console.log(`\n✅ BƯỚC 8: [POST /transfers/{id}/shipments] Đã tạo Shipment.`);
  console.log(`   - Shipment ID: ${shipment._id}`);

  const ts = Date.now();

  // STEP 9: Upload DISPATCH Evidence & Dispatch
  const dispatchUrl = `https://res.cloudinary.com/demo/image/upload/dispatch_evidence_${ts}.jpg`;
  await TransferEvidenceUpload.create({
    transferId: transfer._id,
    shipmentId: shipment._id,
    actorId: stationManagerA._id,
    stage: 'DISPATCH',
    imageUrl: dispatchUrl,
    publicId: `dispatch_${ts}`,
  });

  await transferWorkflow.handover(transfer, shipment, 'DISPATCH', {
    imageUrls: [dispatchUrl],
    note: 'Hàng đã xuất bến tại Trạm A',
  }, stationManagerA);

  invA.quantity -= 50;
  await invA.save();

  console.log(`\n✅ BƯỚC 9: [POST /transfers/{id}/shipments/{shipmentId}/dispatch] Đã xuất bến tại A.`);
  console.log(`   - Kho Trạm A Sau Xuất Bến: Tồn=${invA.quantity} BOX`);

  // STEP 10: Upload REPORT Evidence & Report Delivery
  const reportUrl = `https://res.cloudinary.com/demo/image/upload/report_evidence_${ts}.jpg`;
  await TransferEvidenceUpload.create({
    transferId: transfer._id,
    shipmentId: shipment._id,
    actorId: driverUser._id,
    stage: 'REPORT',
    imageUrl: reportUrl,
    publicId: `report_${ts}`,
  });

  await transferWorkflow.handover(transfer, shipment, 'REPORT', {
    imageUrls: [reportUrl],
    note: 'Tài xế đã giao hàng đến cổng Trạm B',
    items: [{ transferItemId: transferItem._id, quantity: 50 }],
  }, driverUser);
  console.log(`\n✅ BƯỚC 10: [POST /transfers/{id}/shipments/{shipmentId}/report] Tài xế báo đã giao 50 thùng mì tại B.`);

  // STEP 11: Upload RECEIVE Evidence & Receive Shipment
  const receiveUrl = `https://res.cloudinary.com/demo/image/upload/receive_evidence_${ts}.jpg`;
  await TransferEvidenceUpload.create({
    transferId: transfer._id,
    shipmentId: shipment._id,
    actorId: stationManagerB._id,
    stage: 'RECEIVE',
    imageUrl: receiveUrl,
    publicId: `receive_${ts}`,
  });

  await transferWorkflow.handover(transfer, shipment, 'RECEIVE', {
    imageUrls: [receiveUrl],
    note: 'Trạm B đã kiểm đếm và nhận đủ 50 thùng mì',
    items: [{ transferItemId: transferItem._id, quantity: 50 }],
  }, stationManagerB);

  invB.quantity += 50;
  await invB.save();

  console.log(`\n✅ BƯỚC 11: [POST /transfers/{id}/shipments/{shipmentId}/receive] Trạm B xác nhận Nhận hàng.`);
  console.log(`   - Kho Trạm A Cuối Cùng: Tồn=${invA.quantity} BOX`);
  console.log(`   - Kho Trạm B Cuối Cùng: Tồn=${invB.quantity} BOX`);

  // STEP 12: Driver Check-out Task
  assignment.status = 'COMPLETED';
  assignment.checkOutTime = new Date();
  assignment.hoursSpent = 2.0;
  await assignment.save();
  console.log(`\n✅ BƯỚC 12: [POST /workforce/tasks/check-out] Tài xế Check-out hoàn thành nhiệm vụ.`);

  // SECTION: CAMPAIGN RESULTS UPDATE
  campaign.status = 'COMPLETED';
  await campaign.save();

  const mockReq = {
    params: { id: campaign._id.toString() },
    user: adminUser,
    resultsCampaign: campaign,
    body: {
      summary: 'Đã hoàn thành xuất sắc đợt vận chuyển liên trạm và cứu trợ 50 thùng mì tôm cho bà con vùng bão lũ.',
      images: [`https://res.cloudinary.com/demo/image/upload/campaign_summary_${ts}.jpg`],
      handovers: [
        {
          recipientName: 'Ông Nguyễn Văn A',
          recipientRole: 'Chủ tịch Ủy Ban Mặt Trận Tổ Quốc Xã',
          recipientAddress: 'Điểm Cứu Trợ Xã Hải Lăng, Quảng Trị',
          completedAt: new Date().toISOString(),
          items: [
            { itemTypeId: itemTypeId.toString(), quantity: 50, unit: 'BOX' },
          ],
          imageUrls: [`https://res.cloudinary.com/demo/image/upload/handover_evidence_${ts}.jpg`],
        },
      ],
    },
  };

  let resultsResponseData = null;
  const mockRes = {
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    json: function (data) {
      resultsResponseData = data;
      return this;
    },
  };

  await campaignResults.update(mockReq, mockRes, (err) => {
    if (err) console.error('Results update error:', err);
  });

  console.log(`\n================================================================`);
  console.log(`🎉 CẬP NHẬT KẾT QUẢ CHIẾN DỊCH (Campaign.results) THÀNH CÔNG!`);
  console.log(`   - Campaign ID: ${campaign._id}`);
  console.log(`   - Status Code: ${mockRes.statusCode || 200}`);
  console.log(`   - Summary: "${resultsResponseData?.results?.summary}"`);
  console.log(`   - Handovers Count: ${resultsResponseData?.results?.handovers?.length}`);
  console.log(`   - Handovers Item: ${resultsResponseData?.results?.handovers?.[0]?.items?.[0]?.quantity} ${resultsResponseData?.results?.handovers?.[0]?.items?.[0]?.unit}`);
  console.log(`================================================================\n`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Workflow error:', err);
  process.exit(1);
});
