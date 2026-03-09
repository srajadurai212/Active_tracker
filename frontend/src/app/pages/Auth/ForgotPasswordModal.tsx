// Import Dependencies
import { useState } from "react";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import { EnvelopeIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

// Local Imports
import { Button, Input, InputErrorMsg } from "@/components/ui";
import axios from "@/utils/axios";

// ----------------------------------------------------------------------

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ForgotPasswordModal({ open, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setEmail("");
    setError("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      await axios.post("/auth/forgot-password", { email });
      toast.success("If your email is registered, a temporary password has been sent.");
      handleClose();
    } catch {
      // Still show success to avoid email enumeration
      toast.success("If your email is registered, a temporary password has been sent.");
      handleClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition show={open} as="div">
      <Dialog onClose={handleClose} className="relative z-50">
        <TransitionChild
          enter="duration-200 ease-out"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="duration-200 ease-out"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 dark:bg-black/50" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            enter="duration-200 ease-out"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="duration-200 ease-out"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-dark-700">
              <DialogTitle className="text-lg font-semibold text-gray-800 dark:text-dark-100">
                Forgot Password
              </DialogTitle>
              <p className="mt-1 text-sm text-gray-400 dark:text-dark-300">
                Enter your registered email and we&apos;ll send you a temporary password.
              </p>

              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  prefix={<EnvelopeIcon className="size-5" strokeWidth="1" />}
                  required
                />

                <InputErrorMsg when={!!error}>{error}</InputErrorMsg>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="flat"
                    className="flex-1"
                    onClick={handleClose}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    color="primary"
                    className="flex-1"
                    disabled={loading}
                  >
                    {loading ? "Sending..." : "Send Password"}
                  </Button>
                </div>
              </form>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
