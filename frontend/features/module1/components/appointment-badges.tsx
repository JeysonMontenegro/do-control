import type { Appointment, AppointmentReviewItem } from "@/features/module1/types";
import { confirmationLabel, dispatchStatusLabel, getConfirmationBadgeClassName, getReviewBadgeConfig, sourceLabel } from "@/features/module1/console-utils";

type AppointmentBadgesProps = {
  appointment: Appointment;
  latestMessageStatus: string | null;
  reviewItem?: AppointmentReviewItem;
};

export function AppointmentBadges({ appointment, latestMessageStatus, reviewItem }: AppointmentBadgesProps) {
  const reviewBadge = getReviewBadgeConfig(reviewItem);

  return (
    <div className="inline-badges">
      <span className={`badge ${appointment.source === "appoint-me" ? "badge-accent" : "badge-neutral"}`}>
        {sourceLabel(appointment.source)}
      </span>
      <span className={`badge ${getConfirmationBadgeClassName(appointment.confirmation_status)}`}>
        {confirmationLabel(appointment.confirmation_status)}
      </span>
      {latestMessageStatus ? (
        <span className={`badge ${latestMessageStatus === "failed" ? "badge-danger" : "badge-neutral"}`}>
          Mensaje: {dispatchStatusLabel(latestMessageStatus)}
        </span>
      ) : null}
      {reviewBadge ? <span className={`badge ${reviewBadge.className}`}>{reviewBadge.label}</span> : null}
    </div>
  );
}
