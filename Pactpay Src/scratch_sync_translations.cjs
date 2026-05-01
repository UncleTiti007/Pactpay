const fs = require('fs');
const path = require('path');

const missingKeys = [
  "common.loading",
  "admin.success.usersDeactivated",
  "admin.success.usersLocked",
  "admin.success.usersActive",
  "admin.error.failedToggle",
  "admin.confirm.unlockSelected",
  "admin.confirm.lockSelected",
  "admin.confirm.deactivateSelected",
  "admin.confirm.activateSelected",
  "admin.confirm.unlockUser",
  "admin.confirm.lockUser",
  "admin.confirm.deactivateUser",
  "admin.confirm.activateUser",
  "admin.status.deactivated",
  "admin.status.locked",
  "admin.status.active",
  "admin.action.activate",
  "admin.action.deactivate",
  "admin.action.lock",
  "admin.action.unlock",
  "admin.role.admin",
  "common.user",
  "common.error.unauthorized",
  "admin.error.noProfile",
  "admin.title",
  "admin.subtitle",
  "admin.searchPlaceholder",
  "admin.statusAll",
  "admin.statusActive",
  "admin.statusLocked",
  "admin.statusDeactivated",
  "admin.tab.users",
  "admin.tab.kyc",
  "admin.tab.system",
  "admin.users.bulkActions",
  "admin.users.table.user",
  "admin.users.table.role",
  "admin.users.table.status",
  "admin.users.table.joined",
  "admin.users.table.actions",
  "common.unknown",
  "admin.users.noUsers",
  "contract.error.loadingContract",
  "contract.error.notFound",
  "contract.detail.unauthorizedTitle",
  "contract.detail.unauthorizedMsg",
  "contract.detail.notFoundTitle",
  "contract.detail.notFoundMsg",
  "contract.detail.title",
  "contract.detail.subtitle",
  "contract.detail.status",
  "contract.status.draft",
  "contract.status.pending",
  "contract.status.active",
  "contract.status.completed",
  "contract.status.cancelled",
  "contract.status.disputed",
  "contract.detail.activityTab",
  "contract.detail.milestonesTab",
  "contract.detail.messagesTab",
  "contract.detail.fundContract",
  "contract.detail.insufficientBalance",
  "contract.detail.payBtn",
  "contract.detail.contractDetails",
  "contract.detail.noMilestones",
  "contract.detail.markCompletedBtn",
  "contract.detail.disputeBtn",
  "contract.error.acceptFailed",
  "contract.success.accepted",
  "contract.error.rejectFailed",
  "contract.success.rejected",
  "contract.action.accept",
  "contract.action.reject",
  "dashboard.noRecentActivity",
  "dashboard.contractCreated",
  "dashboard.contractUpdated",
  "dashboard.paymentReceived",
  "dashboard.paymentSent",
  "dashboard.milestoneCompleted",
  "dashboard.totalEarnings",
  "dashboard.activeContracts",
  "dashboard.pendingApprovals",
  "dashboard.successRate",
  "withdraw.error.noBankDetails",
  "withdraw.error.insufficientFunds",
  "withdraw.error.loadFailed",
  "withdraw.error.requestFailed",
  "withdraw.success.requested",
  "withdraw.title",
  "withdraw.desc",
  "withdraw.availableToWithdraw",
  "withdraw.amountLabel",
  "withdraw.amountPlaceholder",
  "withdraw.feeInfo",
  "withdraw.totalDeduction",
  "withdraw.bankDetailsTitle",
  "withdraw.bankDetailsMissing",
  "withdraw.bankDetailsAction",
  "withdraw.cancelBtn",
  "withdraw.submitBtn",
  "invite.error.loadingContract",
  "invite.notFoundTitle",
  "invite.notFoundMsg",
  "invite.error.acceptFailed",
  "invite.acceptedNotifTitle",
  "invite.acceptedNotifMsg",
  "invite.acceptedInfo",
  "invite.declineFailed",
  "invite.declinedNotifTitle",
  "invite.declinedNotifMsg",
  "invite.declinedInfo",
  "invite.wantsToWorkWith",
  "invite.kycRequiredTitle",
  "invite.kycPendingMsg",
  "invite.kycRequiredMsg",
  "invite.completeKYCNow",
  "invite.contractLabel",
  "invite.clientLabel",
  "invite.totalAmount",
  "invite.milestonesLabel",
  "invite.kycPendingBtn",
  "invite.kycRequiredBtn",
  "invite.declineInvitation",
  "kyc.error.fileTooLarge",
  "kyc.error.imagesOnly",
  "kyc.error.invalidFormat",
  "kyc.error.uploadFailed",
  "kyc.error.avatarUploadFailed",
  "kyc.error.docsFailed",
  "kyc.error.saveFailed",
  "common.unexpectedError",
  "kyc.steps.personal",
  "kyc.steps.account",
  "kyc.steps.identity",
  "kyc.success.title",
  "kyc.success.desc",
  "kyc.success.btn",
  "kyc.personalInfo",
  "common.locked",
  "kyc.placeholders.fullName",
  "kyc.nameLockedMsg",
  "kyc.placeholders.phone",
  "kyc.placeholders.dob",
  "kyc.error.notAdult",
  "kyc.placeholders.country",
  "common.noResults",
  "common.selected",
  "kyc.profilePic",
  "kyc.accountTypeTitle",
  "kyc.businessName",
  "kyc.regNumber",
  "common.synced",
  "kyc.placeholders.accountName",
  "kyc.identityVerification",
  "kyc.placeholders.idNumber",
  "kyc.selfie",
  "kyc.maxFileSizeNote",
  "kyc.submitBtn",
  "notfound.title",
  "notfound.returnHome",
  "support.error.loadTickets",
  "support.error.loadMessages",
  "support.error.sendMessage",
  "support.notif.newMessageTitle",
  "support.notif.newMessageMsg",
  "support.error.closeTicket",
  "support.success.closed",
  "support.error.createTicket",
  "support.success.created",
  "support.newTicketBtn",
  "support.searchPlaceholder",
  "support.selectTicketMsg",
  "support.ticketId",
  "support.closeTicketBtn",
  "support.backToList",
  "common.supportTeam",
  "support.typeMessagePlaceholder",
  "support.modalTitle",
  "support.modalSubtitle",
  "common.subject",
  "common.message",
  "support.submitBtn",
  "transactions.loading"
];

// Helper: CamelCase to Title Case
function toTitleCase(str) {
  const result = str.replace(/([A-Z])/g, " $1");
  return result.charAt(0).toUpperCase() + result.slice(1).trim();
}

// Custom manual overrides for better UX
const customDefaults = {
  "support.searchPlaceholder": "Search...",
  "common.loading": "Loading...",
  "admin.searchPlaceholder": "Search...",
  "withdraw.amountPlaceholder": "Amount",
  "kyc.placeholders.fullName": "Full Name",
  "kyc.placeholders.phone": "Phone Number",
  "kyc.placeholders.dob": "Date of Birth",
  "kyc.placeholders.country": "Country",
  "kyc.placeholders.accountName": "Account Name",
  "kyc.placeholders.idNumber": "ID Number",
  "support.typeMessagePlaceholder": "Type your message...",
};

// 2. Build nested object for missing keys
const missingObj = {};
for (const key of missingKeys) {
  const parts = key.split('.');
  let current = missingObj;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i === parts.length - 1) {
      // Leaf node, assign value
      let val = customDefaults[key];
      if (!val) {
        val = toTitleCase(part);
        // Clean up some common suffixes/prefixes
        val = val.replace(/ Btn/g, "");
        val = val.replace(/ Msg/g, " Message");
        val = val.replace(/ Notif /g, " Notification ");
        val = val.replace(/ Desc/g, " Description");
      }
      current[part] = val;
    } else {
      current[part] = current[part] || {};
      current = current[part];
    }
  }
}

// Helper: Deep Merge
function deepMerge(target, source) {
  const output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target))
          Object.assign(output, { [key]: source[key] });
        else
          output[key] = deepMerge(target[key], source[key]);
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

// 3. Update en.json
const localesDir = path.join(__dirname, 'src', 'locales');
const enPath = path.join(localesDir, 'en.json');
let enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Merge missing into EN
enJson = deepMerge(enJson, missingObj);
fs.writeFileSync(enPath, JSON.stringify(enJson, null, 2) + '\n');
console.log('Updated en.json with missing keys.');

// 4. Synchronize all other locales
const files = fs.readdirSync(localesDir);
for (const file of files) {
  if (file === 'en.json' || !file.endsWith('.json')) continue;
  
  const filePath = path.join(localesDir, file);
  const existingJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // To keep existing translations but ensure ALL en.json keys are present:
  // Base = enJson, overlay = existingJson
  const merged = deepMerge(enJson, existingJson);
  
  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2) + '\n');
  console.log(`Synchronized ${file}`);
}

console.log('All locale files synchronized successfully!');
