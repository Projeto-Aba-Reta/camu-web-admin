import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { IRoleRepository } from "./interfaces/role-repository.interface";
import type { ISubRoleRepository } from "./interfaces/sub-role-repository.interface";
import type { IUserRepository } from "./interfaces/user-repository.interface";
import type { IAuditLogRepository } from "./interfaces/audit-log-repository.interface";
import type { ISystemSettingsRepository } from "./interfaces/system-settings-repository.interface";
import type { IInviteSessionRepository } from "./interfaces/invite-session-repository.interface";
import type { ICostParameterRepository } from "./interfaces/cost-parameter-repository.interface";
import type { IPrinterRepository } from "./interfaces/printer-repository.interface";
import type { IChannelFeeRepository } from "./interfaces/channel-fee-repository.interface";
import type { ISizeTierRangeRepository } from "./interfaces/size-tier-range-repository.interface";
import type { IPriceCalculationRepository } from "./interfaces/price-calculation-repository.interface";
import type { IPartnershipAgreementRepository } from "./interfaces/partnership-agreement-repository.interface";
import type { ICapitalContributionRepository } from "./interfaces/capital-contribution-repository.interface";
import type { ILegalEntityStatusRepository } from "./interfaces/legal-entity-status-repository.interface";
import type { ILegalMigrationTriggerRepository } from "./interfaces/legal-migration-trigger-repository.interface";
import type { IRevenueSnapshotRepository } from "./interfaces/revenue-snapshot-repository.interface";
import type { IDecisionLogEntryRepository } from "./interfaces/decision-log-entry-repository.interface";
import type { IProductRepository } from "./interfaces/product-repository.interface";
import type { IProductMediaRepository } from "./interfaces/product-media-repository.interface";
import type { IProductChannelListingRepository } from "./interfaces/product-channel-listing-repository.interface";
import { SupabaseRoleRepository } from "./supabase/supabase-role-repository";
import { SupabaseSubRoleRepository } from "./supabase/supabase-sub-role-repository";
import { SupabaseUserRepository } from "./supabase/supabase-user-repository";
import { SupabaseAuditLogRepository } from "./supabase/supabase-audit-log-repository";
import { SupabaseSystemSettingsRepository } from "./supabase/supabase-system-settings-repository";
import { SupabaseInviteSessionRepository } from "./supabase/supabase-invite-session-repository";
import { SupabaseCostParameterRepository } from "./supabase/supabase-cost-parameter-repository";
import { SupabasePrinterRepository } from "./supabase/supabase-printer-repository";
import { SupabaseChannelFeeRepository } from "./supabase/supabase-channel-fee-repository";
import { SupabaseSizeTierRangeRepository } from "./supabase/supabase-size-tier-range-repository";
import { SupabasePriceCalculationRepository } from "./supabase/supabase-price-calculation-repository";
import { SupabasePartnershipAgreementRepository } from "./supabase/supabase-partnership-agreement-repository";
import { SupabaseCapitalContributionRepository } from "./supabase/supabase-capital-contribution-repository";
import { SupabaseLegalEntityStatusRepository } from "./supabase/supabase-legal-entity-status-repository";
import { SupabaseLegalMigrationTriggerRepository } from "./supabase/supabase-legal-migration-trigger-repository";
import { SupabaseRevenueSnapshotRepository } from "./supabase/supabase-revenue-snapshot-repository";
import { SupabaseDecisionLogEntryRepository } from "./supabase/supabase-decision-log-entry-repository";
import { SupabaseProductRepository } from "./supabase/supabase-product-repository";
import { SupabaseProductMediaRepository } from "./supabase/supabase-product-media-repository";
import { SupabaseProductChannelListingRepository } from "./supabase/supabase-product-channel-listing-repository";

export interface Repositories {
  roles: IRoleRepository;
  subRoles: ISubRoleRepository;
  users: IUserRepository;
  auditLog: IAuditLogRepository;
  systemSettings: ISystemSettingsRepository;
  inviteSessions: IInviteSessionRepository;
  costParameters: ICostParameterRepository;
  printers: IPrinterRepository;
  channelFees: IChannelFeeRepository;
  sizeTierRanges: ISizeTierRangeRepository;
  priceCalculations: IPriceCalculationRepository;
  partnershipAgreements: IPartnershipAgreementRepository;
  capitalContributions: ICapitalContributionRepository;
  legalEntityStatus: ILegalEntityStatusRepository;
  legalMigrationTriggers: ILegalMigrationTriggerRepository;
  revenueSnapshots: IRevenueSnapshotRepository;
  decisionLogEntries: IDecisionLogEntryRepository;
  products: IProductRepository;
  productMedia: IProductMediaRepository;
  productChannelListings: IProductChannelListingRepository;
}

// Composition root: único ponto que muda para trocar de provedor de dados.
export function createRepositories(supabaseClient: SupabaseClient<Database>): Repositories {
  return {
    roles: new SupabaseRoleRepository(supabaseClient),
    subRoles: new SupabaseSubRoleRepository(supabaseClient),
    users: new SupabaseUserRepository(supabaseClient),
    auditLog: new SupabaseAuditLogRepository(supabaseClient),
    systemSettings: new SupabaseSystemSettingsRepository(supabaseClient),
    inviteSessions: new SupabaseInviteSessionRepository(supabaseClient),
    costParameters: new SupabaseCostParameterRepository(supabaseClient),
    printers: new SupabasePrinterRepository(supabaseClient),
    channelFees: new SupabaseChannelFeeRepository(supabaseClient),
    sizeTierRanges: new SupabaseSizeTierRangeRepository(supabaseClient),
    priceCalculations: new SupabasePriceCalculationRepository(supabaseClient),
    partnershipAgreements: new SupabasePartnershipAgreementRepository(supabaseClient),
    capitalContributions: new SupabaseCapitalContributionRepository(supabaseClient),
    legalEntityStatus: new SupabaseLegalEntityStatusRepository(supabaseClient),
    legalMigrationTriggers: new SupabaseLegalMigrationTriggerRepository(supabaseClient),
    revenueSnapshots: new SupabaseRevenueSnapshotRepository(supabaseClient),
    decisionLogEntries: new SupabaseDecisionLogEntryRepository(supabaseClient),
    products: new SupabaseProductRepository(supabaseClient),
    productMedia: new SupabaseProductMediaRepository(supabaseClient),
    productChannelListings: new SupabaseProductChannelListingRepository(supabaseClient),
  };
}
