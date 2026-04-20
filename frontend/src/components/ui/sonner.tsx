import { Toaster as SonnerToaster, toast } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      closeButton
      duration={4000}
      gap={10}
      offset={24}
      toastOptions={{
        classNames: {
          toast: 'dg-toast',
          title: 'dg-toast-title',
          description: 'dg-toast-desc',
          actionButton: 'dg-toast-action',
          cancelButton: 'dg-toast-cancel',
          closeButton: 'dg-toast-close',
          success: 'dg-toast--success',
          error: 'dg-toast--error',
          warning: 'dg-toast--warning',
          info: 'dg-toast--info',
          default: 'dg-toast--default',
        },
      }}
    />
  );
}

export { toast };
