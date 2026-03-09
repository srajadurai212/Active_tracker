import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowLeftIcon,
  CalendarDaysIcon,
  UserIcon,
  TagIcon,
} from "@heroicons/react/24/outline";

import { Page } from "@/components/shared/Page";
import { Card } from "@/components/ui";
import { Activity } from "@/@types/activity";
import { activityService } from "@/services/activityService";
import { useAuthContext } from "@/app/contexts/auth/context";

const STATUS_COLORS: Record<string, string> = {
  Open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "In Progress": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Completed: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Closed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "On Hold": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ReviewPage() {
  const { activityId } = useParams<{ activityId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!activityId) return;
    activityService
      .getById(activityId)
      .then(setActivity)
      .catch(() => toast.error("Failed to load activity"))
      .finally(() => setLoading(false));
  }, [activityId]);

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== "admin") {
      toast.error("Admin access required");
      navigate("/activities", { replace: true });
    }
  }, [user, navigate]);

  const handleApprove = async () => {
    if (!activityId) return;
    setSubmitting(true);
    try {
      await activityService.approve(activityId);
      toast.success("Activity approved and closed");
      navigate("/activities");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!activityId) return;
    setSubmitting(true);
    try {
      await activityService.reject(activityId, rejectReason || undefined);
      toast.success("Activity rejected and sent back");
      navigate("/activities");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Page title="Review Activity">
        <div className="flex h-64 items-center justify-center text-gray-400">Loading…</div>
      </Page>
    );
  }

  if (!activity) {
    return (
      <Page title="Review Activity">
        <div className="flex h-64 items-center justify-center text-gray-400">Activity not found.</div>
      </Page>
    );
  }

  const alreadyProcessed = activity.status !== "Completed";

  return (
    <Page title="Review Activity">
      <div className="transition-content px-(--margin-x) pb-6 pt-4">
        {/* Back */}
        <button
          type="button"
          onClick={() => navigate("/activities")}
          className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-dark-400 dark:hover:text-dark-200"
        >
          <ArrowLeftIcon className="size-4" />
          Back to Activities
        </button>

        <div className="mb-5 flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-800 dark:text-dark-100">Review Activity</h1>
          <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${STATUS_COLORS[activity.status] ?? STATUS_COLORS["Open"]}`}>
            {activity.status}
          </span>
        </div>

        {alreadyProcessed && (
          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
            This activity has already been processed (status: {activity.status}).
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-3">
          {/* Activity Details */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-400">
                Activity Details
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-400 dark:text-dark-400">Client Name</p>
                  <p className="text-base font-semibold text-gray-800 dark:text-dark-100">{activity.client_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-dark-400">Action Item</p>
                  <p className="text-sm text-gray-700 dark:text-dark-200 whitespace-pre-wrap">{activity.action_item}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="flex items-start gap-2">
                    <UserIcon className="mt-0.5 size-4 shrink-0 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-400 dark:text-dark-400">Assigned To</p>
                      <p className="text-sm text-gray-700 dark:text-dark-200">
                        {activity.assigned_to?.full_name ?? "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <TagIcon className="mt-0.5 size-4 shrink-0 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-400 dark:text-dark-400">Activity Type</p>
                      <p className="text-sm text-gray-700 dark:text-dark-200">{activity.activity_type ?? "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CalendarDaysIcon className="mt-0.5 size-4 shrink-0 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-400 dark:text-dark-400">Target Closure</p>
                      <p className="text-sm text-gray-700 dark:text-dark-200">{formatDate(activity.target_closure_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CalendarDaysIcon className="mt-0.5 size-4 shrink-0 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-400 dark:text-dark-400">Actual Closure</p>
                      <p className="text-sm text-gray-700 dark:text-dark-200">{formatDate(activity.actual_closure_date)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Progress Notes */}
            {activity.remarks && (
              <Card className="p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-400">
                  Progress Notes
                </h2>
                <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-dark-200 font-sans leading-relaxed">
                  {activity.remarks}
                </pre>
              </Card>
            )}
          </div>

          {/* Actions Panel */}
          <div className="space-y-4">
            <Card className="p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-400">
                Decision
              </h2>

              {alreadyProcessed ? (
                <p className="text-sm text-gray-500 dark:text-dark-400">
                  No action required — this activity is already {activity.status}.
                </p>
              ) : (
                <div className="space-y-3">
                  {/* Approve */}
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleApprove}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-60"
                  >
                    <CheckCircleIcon className="size-5" />
                    Approve & Close
                  </button>

                  {/* Reject */}
                  {!showRejectForm ? (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setShowRejectForm(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-60"
                    >
                      <XCircleIcon className="size-5" />
                      Reject
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-600 dark:text-dark-300">
                        Reason for rejection (optional)
                      </label>
                      <textarea
                        rows={3}
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Explain why the activity is being sent back..."
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400 dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={handleReject}
                          className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
                        >
                          {submitting ? "Rejecting…" : "Confirm Reject"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowRejectForm(false); setRejectReason(""); }}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 dark:border-dark-500 dark:text-dark-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Meta */}
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-400">
                Info
              </h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-400 dark:text-dark-400">Domain</dt>
                  <dd className="text-gray-700 dark:text-dark-200">{activity.product_domain ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400 dark:text-dark-400">Entry Date</dt>
                  <dd className="text-gray-700 dark:text-dark-200">{formatDate(activity.entry_date)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400 dark:text-dark-400">Created by</dt>
                  <dd className="text-gray-700 dark:text-dark-200">{activity.created_by?.full_name ?? "—"}</dd>
                </div>
              </dl>
            </Card>
          </div>
        </div>
      </div>
    </Page>
  );
}
