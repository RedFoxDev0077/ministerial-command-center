import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      expand={true}
      richColors={true}
      closeButton={true}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-2xl group-[.toaster]:rounded-lg group-[.toaster]:p-4 group-[.toaster]:cursor-pointer",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-md",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-md",
          closeButton: "group-[.toast]:bg-background group-[.toast]:border group-[.toast]:border-border group-[.toast]:hover:bg-muted",
          success: "group-[.toaster]:border-l-4 group-[.toaster]:border-l-green-500",
          error: "group-[.toaster]:border-l-4 group-[.toaster]:border-l-red-500",
          warning: "group-[.toaster]:border-l-4 group-[.toaster]:border-l-yellow-500",
          info: "group-[.toaster]:border-l-4 group-[.toaster]:border-l-blue-500",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
