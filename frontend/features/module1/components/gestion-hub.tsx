"use client";

import type { ComponentProps } from "react";

import { DEFAULT_CONFIRMATION_BODY, DEFAULT_CONFIRMATION_TITLE } from "@/features/module1/console-config";
import { GestionEmailSection } from "@/features/module1/components/gestion-email-section";
import { GestionMessagesSection } from "@/features/module1/components/gestion-messages-section";
import { GestionReceptionSection } from "@/features/module1/components/gestion-reception-section";
import { GestionRemindersSection } from "@/features/module1/components/gestion-reminders-section";
import { GestionSummarySection } from "@/features/module1/components/gestion-summary-section";
import type { Doctor } from "@/features/module1/types";

type GestionSubtab = "resumen" | "mensajes" | "recordatorios" | "correos" | "recepcion";

type GestionHubProps = {
  activateDefault24HourReminder: ComponentProps<typeof GestionRemindersSection>["activateDefault24HourReminder"];
  activeDoctorsCount: number;
  activeReceptionists: ComponentProps<typeof GestionReceptionSection>["activeReceptionists"];
  activeReceptionistsCount: number;
  activeReceptionistsPager: React.ReactNode;
  allowMultiDoctorVisibility: boolean;
  availableDoctors: Doctor[];
  cancelledUpcomingCount: number;
  clinicSetting: ComponentProps<typeof GestionEmailSection>["clinicSetting"];
  communicationTemplates: ComponentProps<typeof GestionMessagesSection>["communicationTemplates"];
  confirmationTemplatePreview: ComponentProps<typeof GestionMessagesSection>["templatePreview"];
  confirmedUpcomingCount: number;
  currentUserDisplay: string;
  currentUserEmail: string;
  currentUserProfilePhotoUrl: string | null;
  doctorNameById: ComponentProps<typeof GestionRemindersSection>["doctorNameById"];
  emailWhitelist: ComponentProps<typeof GestionEmailSection>["emailWhitelist"];
  emailDispatches: ComponentProps<typeof GestionEmailSection>["emailDispatches"];
  emailTemplateForm: ComponentProps<typeof GestionEmailSection>["emailTemplateForm"];
  emailTemplatePreview: ComponentProps<typeof GestionEmailSection>["emailTemplatePreview"];
  emailTemplates: ComponentProps<typeof GestionEmailSection>["emailTemplates"];
  generalReminderRule: ComponentProps<typeof GestionRemindersSection>["generalReminderRule"];
  gestionSubtab: GestionSubtab;
  inactiveReceptionists: ComponentProps<typeof GestionReceptionSection>["inactiveReceptionists"];
  inactiveReceptionistsPager: React.ReactNode;
  inactiveUsersCount: number;
  isAdmin: boolean;
  onAddReceptionist: () => void;
  onAddEmailWhitelistAddress: ComponentProps<typeof GestionEmailSection>["onAddEmailWhitelistAddress"];
  onAddMessagingWhitelistPhone: ComponentProps<typeof GestionEmailSection>["onAddMessagingWhitelistPhone"];
  onEditReceptionist: ComponentProps<typeof GestionReceptionSection>["onEditReceptionist"];
  onGoToAgendaAppointment: (appointmentId: number) => void;
  onGestionSubtabChange: (tab: GestionSubtab) => void;
  onProfilePhotoChange: ComponentProps<typeof GestionSummarySection>["onProfilePhotoChange"];
  onRemoveEmailWhitelistAddress: ComponentProps<typeof GestionEmailSection>["onRemoveEmailWhitelistAddress"];
  onRemoveMessagingWhitelistPhone: ComponentProps<typeof GestionEmailSection>["onRemoveMessagingWhitelistPhone"];
  onSelectReceptionist: ComponentProps<typeof GestionReceptionSection>["onSelectReceptionist"];
  paginatedActiveReceptionists: ComponentProps<typeof GestionReceptionSection>["paginatedActiveReceptionists"];
  paginatedInactiveReceptionists: ComponentProps<typeof GestionReceptionSection>["paginatedInactiveReceptionists"];
  previewConfirmationTemplate: ComponentProps<typeof GestionMessagesSection>["previewConfirmationTemplate"];
  previewEmailTemplate: ComponentProps<typeof GestionEmailSection>["previewEmailTemplate"];
  profileForm: ComponentProps<typeof GestionSummarySection>["profileForm"];
  reminderRuleForm: ComponentProps<typeof GestionRemindersSection>["reminderRuleForm"];
  reminderRules: ComponentProps<typeof GestionRemindersSection>["reminderRules"];
  remindersScheduledCount: number;
  resendEmailDispatch: ComponentProps<typeof GestionEmailSection>["resendEmailDispatch"];
  saveConfirmationTemplate: ComponentProps<typeof GestionMessagesSection>["saveConfirmationTemplate"];
  saveEmailTemplate: ComponentProps<typeof GestionEmailSection>["saveEmailTemplate"];
  scopedDoctorId: number | null;
  scopedUpcomingAppointments: ComponentProps<typeof GestionSummarySection>["scopedUpcomingAppointments"];
  selectedDoctor: Doctor | null;
  selectedReceptionist: ComponentProps<typeof GestionReceptionSection>["selectedReceptionist"];
  sendTestEmail: ComponentProps<typeof GestionEmailSection>["sendTestEmail"];
  setEmailTemplateForm: ComponentProps<typeof GestionEmailSection>["setEmailTemplateForm"];
  setReminderRuleForm: ComponentProps<typeof GestionRemindersSection>["setReminderRuleForm"];
  setTemplateForm: ComponentProps<typeof GestionMessagesSection>["setTemplateForm"];
  setTestEmailRecipient: ComponentProps<typeof GestionEmailSection>["setTestEmailRecipient"];
  setProfileForm: ComponentProps<typeof GestionSummarySection>["setProfileForm"];
  submitReminderRule: ComponentProps<typeof GestionRemindersSection>["submitReminderRule"];
  templateForm: ComponentProps<typeof GestionMessagesSection>["templateForm"];
  testEmailRecipient: ComponentProps<typeof GestionEmailSection>["testEmailRecipient"];
  toggleEmailDelivery: ComponentProps<typeof GestionEmailSection>["toggleEmailDelivery"];
  toggleEmailWhitelist: ComponentProps<typeof GestionEmailSection>["onToggleEmailWhitelist"];
  toggleEmailProcessSetting: ComponentProps<typeof GestionEmailSection>["toggleEmailProcessSetting"];
  toggleMessagingWhitelist: ComponentProps<typeof GestionEmailSection>["onToggleMessagingWhitelist"];
  toggleMultiDoctorVisibility: ComponentProps<typeof GestionSummarySection>["toggleMultiDoctorVisibility"];
  toggleReceptionistActive: ComponentProps<typeof GestionReceptionSection>["toggleReceptionistActive"];
  toggleReminderRule: ComponentProps<typeof GestionRemindersSection>["toggleReminderRule"];
  toggleTemplate: ComponentProps<typeof GestionMessagesSection>["toggleTemplate"];
  unconfirmedUpcomingCount: number;
  updateCurrentProfile: ComponentProps<typeof GestionSummarySection>["updateCurrentProfile"];
  uploadCurrentProfilePhoto: ComponentProps<typeof GestionSummarySection>["uploadCurrentProfilePhoto"];
  messagingWhitelist: ComponentProps<typeof GestionEmailSection>["messagingWhitelist"];
};

export function GestionHub({
  activateDefault24HourReminder,
  activeDoctorsCount,
  activeReceptionists,
  activeReceptionistsCount,
  activeReceptionistsPager,
  allowMultiDoctorVisibility,
  availableDoctors,
  cancelledUpcomingCount,
  clinicSetting,
  communicationTemplates,
  confirmationTemplatePreview,
  confirmedUpcomingCount,
  currentUserDisplay,
  currentUserEmail,
  currentUserProfilePhotoUrl,
  doctorNameById,
  emailWhitelist,
  emailDispatches,
  emailTemplateForm,
  emailTemplatePreview,
  emailTemplates,
  generalReminderRule,
  gestionSubtab,
  inactiveReceptionists,
  inactiveReceptionistsPager,
  inactiveUsersCount,
  isAdmin,
  onAddReceptionist,
  onAddEmailWhitelistAddress,
  onAddMessagingWhitelistPhone,
  onEditReceptionist,
  onGoToAgendaAppointment,
  onGestionSubtabChange,
  onProfilePhotoChange,
  onRemoveEmailWhitelistAddress,
  onRemoveMessagingWhitelistPhone,
  onSelectReceptionist,
  paginatedActiveReceptionists,
  paginatedInactiveReceptionists,
  previewConfirmationTemplate,
  previewEmailTemplate,
  profileForm,
  reminderRuleForm,
  reminderRules,
  remindersScheduledCount,
  resendEmailDispatch,
  saveConfirmationTemplate,
  saveEmailTemplate,
  scopedDoctorId,
  scopedUpcomingAppointments,
  selectedDoctor,
  selectedReceptionist,
  sendTestEmail,
  setEmailTemplateForm,
  setProfileForm,
  setReminderRuleForm,
  setTemplateForm,
  setTestEmailRecipient,
  submitReminderRule,
  templateForm,
  testEmailRecipient,
  toggleEmailDelivery,
  toggleEmailProcessSetting,
  toggleMultiDoctorVisibility,
  toggleReceptionistActive,
  toggleReminderRule,
  toggleTemplate,
  unconfirmedUpcomingCount,
  updateCurrentProfile,
  uploadCurrentProfilePhoto,
  messagingWhitelist,
}: GestionHubProps) {
  const gestionTabs: Array<{ id: GestionSubtab; label: string }> = [
    { id: "resumen", label: "Resumen" },
    { id: "mensajes", label: "Mensajes" },
    { id: "recordatorios", label: "Recordatorios" },
    ...(isAdmin ? [{ id: "correos" as GestionSubtab, label: "Correos" }, { id: "recepcion" as GestionSubtab, label: "Recepción" }] : []),
  ];

  return (
    <section className="tab-layout">
      <article className="card section-card span-three">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Configuración</p>
            <h2>Centro de administración</h2>
          </div>
          {selectedDoctor ? <div className="context-pill">Contexto: {selectedDoctor.first_name} {selectedDoctor.last_name}</div> : null}
        </div>
        <div className="chip-row">
          {gestionTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`filter-chip ${gestionSubtab === tab.id ? "filter-chip-active" : ""}`}
              onClick={() => onGestionSubtabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </article>

      {gestionSubtab === "resumen" ? (
        <GestionSummarySection
          activeDoctorsCount={activeDoctorsCount}
          activeReceptionistsCount={activeReceptionistsCount}
          allowMultiDoctorVisibility={allowMultiDoctorVisibility}
          cancelledUpcomingCount={cancelledUpcomingCount}
          confirmedUpcomingCount={confirmedUpcomingCount}
          currentUserDisplay={currentUserDisplay}
          currentUserEmail={currentUserEmail}
          currentUserProfilePhotoUrl={currentUserProfilePhotoUrl}
          inactiveUsersCount={inactiveUsersCount}
          isAdmin={isAdmin}
          onGoToAgendaAppointment={onGoToAgendaAppointment}
          onProfilePhotoChange={onProfilePhotoChange}
          profileForm={profileForm}
          remindersScheduledCount={remindersScheduledCount}
          scopedUpcomingAppointments={scopedUpcomingAppointments}
          setProfileForm={setProfileForm}
          toggleMultiDoctorVisibility={toggleMultiDoctorVisibility}
          unconfirmedUpcomingCount={unconfirmedUpcomingCount}
          updateCurrentProfile={updateCurrentProfile}
          uploadCurrentProfilePhoto={uploadCurrentProfilePhoto}
        />
      ) : null}

      {gestionSubtab === "mensajes" ? (
        <GestionMessagesSection
          communicationTemplates={communicationTemplates}
          confirmationBodyPlaceholder={DEFAULT_CONFIRMATION_BODY}
          confirmationTitlePlaceholder={DEFAULT_CONFIRMATION_TITLE}
          previewConfirmationTemplate={previewConfirmationTemplate}
          saveConfirmationTemplate={saveConfirmationTemplate}
          scopedDoctorId={scopedDoctorId}
          setTemplateForm={setTemplateForm}
          templateForm={templateForm}
          templatePreview={confirmationTemplatePreview}
          toggleTemplate={toggleTemplate}
        />
      ) : null}

      {gestionSubtab === "recordatorios" ? (
        <GestionRemindersSection
          activateDefault24HourReminder={activateDefault24HourReminder}
          availableDoctors={availableDoctors}
          doctorNameById={doctorNameById}
          generalReminderRule={generalReminderRule}
          isAdmin={isAdmin}
          reminderRuleForm={reminderRuleForm}
          reminderRules={reminderRules}
          scopedDoctorId={scopedDoctorId}
          scopedUpcomingAppointmentsCount={scopedUpcomingAppointments.length}
          selectedDoctor={selectedDoctor}
          setReminderRuleForm={setReminderRuleForm}
          submitReminderRule={submitReminderRule}
          toggleReminderRule={toggleReminderRule}
        />
      ) : null}

      {gestionSubtab === "correos" && isAdmin ? (
        <GestionEmailSection
          clinicSetting={clinicSetting}
          emailWhitelist={emailWhitelist}
          emailDispatches={emailDispatches}
          emailTemplateForm={emailTemplateForm}
          emailTemplatePreview={emailTemplatePreview}
          emailTemplates={emailTemplates}
          messagingWhitelist={messagingWhitelist}
          onAddEmailWhitelistAddress={onAddEmailWhitelistAddress}
          onAddMessagingWhitelistPhone={onAddMessagingWhitelistPhone}
          onRemoveEmailWhitelistAddress={onRemoveEmailWhitelistAddress}
          onRemoveMessagingWhitelistPhone={onRemoveMessagingWhitelistPhone}
          onToggleEmailWhitelist={toggleEmailWhitelist}
          onToggleMessagingWhitelist={toggleMessagingWhitelist}
          previewEmailTemplate={previewEmailTemplate}
          resendEmailDispatch={resendEmailDispatch}
          saveEmailTemplate={saveEmailTemplate}
          sendTestEmail={sendTestEmail}
          setEmailTemplateForm={setEmailTemplateForm}
          setTestEmailRecipient={setTestEmailRecipient}
          testEmailRecipient={testEmailRecipient}
          toggleEmailDelivery={toggleEmailDelivery}
          toggleEmailProcessSetting={toggleEmailProcessSetting}
        />
      ) : null}

      {gestionSubtab === "recepcion" && isAdmin ? (
        <GestionReceptionSection
          activeReceptionists={activeReceptionists}
          activeReceptionistsPager={activeReceptionistsPager}
          inactiveReceptionists={inactiveReceptionists}
          inactiveReceptionistsPager={inactiveReceptionistsPager}
          onAddReceptionist={onAddReceptionist}
          onEditReceptionist={onEditReceptionist}
          onSelectReceptionist={onSelectReceptionist}
          paginatedActiveReceptionists={paginatedActiveReceptionists}
          paginatedInactiveReceptionists={paginatedInactiveReceptionists}
          selectedReceptionist={selectedReceptionist}
          toggleReceptionistActive={toggleReceptionistActive}
        />
      ) : null}
    </section>
  );
}
