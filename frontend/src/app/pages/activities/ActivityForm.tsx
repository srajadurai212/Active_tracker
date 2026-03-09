import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { useNavigate } from "react-router";

import { Activity, ActivityCreate, ActivityUpdate, ACTIVITY_TYPES, ACTIVITY_STATUSES, PRODUCT_DOMAINS } from "@/@types/activity";
import { activityService } from "@/services/activityService";
import { useAllUserNames } from "@/hooks/useUsers";
import { useAuthContext } from "@/app/contexts/auth/context";
import { Button, Input } from "@/components/ui";

function formatProgressDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const mm = months[d.getMonth()];
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

interface FormValues {
  client_name: string;
  entry_date: string;
  action_item: string;
  assigned_to_id: string;
  product_domain: string;
  activity_type: string;
  target_closure_date: string;
  actual_closure_date: string;
  status: string;
  remarks: string;
  target_date_change_remarks: string;
}

interface ActivityFormProps {
  activity?: Activity | null;
  viewOnly?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ActivityForm({ activity, viewOnly = false, onSuccess, onCancel }: ActivityFormProps) {
  const { users } = useAllUserNames();
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const isEditing = !!activity;

  const allowedStatuses = user?.role === "admin"
    ? ACTIVITY_STATUSES
    : ACTIVITY_STATUSES.filter((s) => s !== "Closed");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      client_name: "",
      entry_date: new Date().toISOString().split("T")[0],
      action_item: "",
      assigned_to_id: "",
      product_domain: "",
      activity_type: "",
      target_closure_date: "",
      actual_closure_date: "",
      status: "Open",
      remarks: "",
      target_date_change_remarks: "",
    },
  });

  // Re-run reset once users have loaded so the assigned_to select
  // has its options in the DOM before we try to set the value.
  useEffect(() => {
    if (activity) {
      reset({
        client_name: activity.client_name,
        entry_date: activity.entry_date,
        action_item: activity.action_item,
        assigned_to_id: activity.assigned_to_id ?? "",
        product_domain: activity.product_domain ?? "",
        activity_type: activity.activity_type ?? "",
        target_closure_date: activity.target_closure_date ?? "",
        actual_closure_date: activity.actual_closure_date ?? "",
        status: activity.status,
        remarks: "",
        target_date_change_remarks: "",
      });
    }
  }, [activity, reset, users]);

  const watchedTargetDate = watch("target_closure_date");
  const targetDateChanged = isEditing && watchedTargetDate !== (activity?.target_closure_date ?? "");

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    if (!values.client_name.trim()) {
      return;
    }
    // For edit mode, prepend a dated progress entry if user typed something
    let finalRemarks: string | null;
    if (isEditing && activity) {
      if (values.remarks.trim()) {
        const datePrefix = formatProgressDate(new Date());
        const newEntry = `${datePrefix}:- ${values.remarks.trim()}`;
        finalRemarks = activity.remarks
          ? `${newEntry}\n${activity.remarks}`
          : newEntry;
      } else {
        finalRemarks = activity.remarks ?? null;
      }
    } else {
      finalRemarks = values.remarks || null;
    }

    const payload = {
      client_name: values.client_name,
      entry_date: values.entry_date,
      action_item: values.action_item,
      assigned_to_id: values.assigned_to_id || null,
      product_domain: values.product_domain || null,
      activity_type: values.activity_type || null,
      target_closure_date: values.target_closure_date || null,
      actual_closure_date: values.actual_closure_date || null,
      status: values.status as ActivityCreate["status"],
      remarks: finalRemarks,
    };

    try {
      if (isEditing && activity) {
        const updatePayload: ActivityUpdate = {
          ...payload,
          target_date_change_remarks: values.target_date_change_remarks || null,
        };
        await activityService.update(activity.id, updatePayload);
        toast.success("Activity updated successfully");
      } else {
        await activityService.create(payload as ActivityCreate);
        toast.success("Activity created successfully");
      }
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Operation failed");
    }
  };

  // Shared class for select/textarea in view-only mode
  const fieldCls = (base: string) =>
    viewOnly
      ? `${base} disabled:cursor-default disabled:bg-gray-50 disabled:text-gray-700 dark:disabled:bg-dark-800 dark:disabled:text-dark-200 disabled:opacity-100`
      : base;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Input
            label="Client Name *"
            placeholder="Enter client name"
            disabled={viewOnly}
            {...register("client_name", { required: !viewOnly && "Client name is required" })}
            error={errors.client_name?.message}
          />
        </div>
        <div>
          <Input
            label="Entry Date *"
            type="date"
            disabled={viewOnly}
            {...register("entry_date", { required: !viewOnly && "Entry date is required" })}
            error={errors.entry_date?.message}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-200">
          Action Item {!viewOnly && "*"}
        </label>
        <textarea
          rows={3}
          disabled={viewOnly}
          className={fieldCls("w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100")}
          placeholder="Describe the action item..."
          {...register("action_item", { required: !viewOnly && "Action item is required" })}
        />
        {errors.action_item && (
          <p className="mt-1 text-xs text-red-500">{errors.action_item.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-200">
            Assigned To
          </label>
          <select
            disabled={viewOnly}
            className={fieldCls("w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100")}
            {...register("assigned_to_id")}
          >
            <option value="">— Select user —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-200">
            Product Domain
          </label>
          <select
            disabled={viewOnly}
            className={fieldCls("w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100")}
            {...register("product_domain")}
          >
            <option value="">— Select domain —</option>
            {activity?.product_domain && !PRODUCT_DOMAINS.includes(activity.product_domain) && (
              <option value={activity.product_domain}>{activity.product_domain}</option>
            )}
            {PRODUCT_DOMAINS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-200">
            Activity Type
          </label>
          <select
            disabled={viewOnly}
            className={fieldCls("w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100")}
            {...register("activity_type")}
          >
            <option value="">— Select type —</option>
            {activity?.activity_type && !ACTIVITY_TYPES.includes(activity.activity_type) && (
              <option value={activity.activity_type}>{activity.activity_type}</option>
            )}
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-200">
            Status {!viewOnly && "*"}
          </label>
          <select
            disabled={viewOnly}
            className={fieldCls("w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100")}
            {...register("status", { required: !viewOnly && "Status is required" })}
          >
            {/* In view-only, show all statuses so the current value renders correctly */}
            {(viewOnly ? ACTIVITY_STATUSES : allowedStatuses).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {errors.status && (
            <p className="mt-1 text-xs text-red-500">{errors.status.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Input
            label="Target Closure Date"
            type="date"
            disabled={viewOnly}
            {...register("target_closure_date")}
          />
        </div>
        <div>
          <Input
            label="Actual Closure Date"
            type="date"
            disabled={viewOnly}
            {...register("actual_closure_date")}
          />
        </div>
      </div>

      {!viewOnly && targetDateChanged && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-200">
            Reason for date change *
          </label>
          <textarea
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
            placeholder="Explain why the target date is being changed..."
            {...register("target_date_change_remarks", {
              validate: (val) =>
                !targetDateChanged || (val?.trim().length > 0) || "Reason for date change is required",
            })}
          />
          {errors.target_date_change_remarks && (
            <p className="mt-1 text-xs text-red-500">{errors.target_date_change_remarks.message}</p>
          )}
        </div>
      )}

      {viewOnly ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-dark-600 dark:bg-dark-800">
          <p className="text-sm text-gray-500 dark:text-dark-400">
            Progress updates are recorded in the activity history.{" "}
            <button
              type="button"
              onClick={() => { onCancel(); navigate(`/history/${activity?.id}`); }}
              className="font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
              View history →
            </button>
          </p>
        </div>
      ) : (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-200">
            {isEditing ? "Progress Update" : "Remarks"}
          </label>
          <textarea
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
            placeholder={isEditing ? "Add a new progress update..." : "Additional remarks..."}
            {...register("remarks")}
          />
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        {viewOnly ? (
          <Button type="button" color="primary" onClick={onCancel}>
            Close
          </Button>
        ) : (
          <>
            <Button type="button" variant="outlined" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" color="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEditing ? "Update Activity" : "Create Activity"}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
