/**
 * Cultivate UI — single import point for all shared components.
 *
 * App code should import from here, not from individual component files:
 *   import { Dropdown, Tooltip, GlassCircleButton } from "@/components/cultivate-ui";
 *
 * Sections:
 *   1. Cultivate-branded wrappers around shadcn primitives (Button, Card, Input, Textarea)
 *   2. Re-exports of custom Cultivate components (Dropdown, Tooltip, GlassCircleButton, etc.)
 *   3. Re-exports of shadcn primitives that don't need restyling
 */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ============================================================================
// 1. CULTIVATE-BRANDED SHADCN WRAPPERS
// ============================================================================

interface CultivateButtonProps extends React.ComponentPropsWithoutRef<typeof Button> {}

/** Primary action button — Cultivate green. */
export function CultivateButton({ className, ...props }: CultivateButtonProps) {
  return (
    <Button
      className={cn(
        "bg-cultivate-green-dark hover:bg-cultivate-green-deep text-white font-medium transition-colors",
        className
      )}
      {...props}
    />
  );
}

/** Secondary outlined button — Cultivate green border. */
export function CultivateButtonSecondary({ className, ...props }: CultivateButtonProps) {
  return (
    <Button
      variant="outline"
      className={cn(
        "border-cultivate-green-dark text-cultivate-green-dark hover:bg-cultivate-green-dark hover:text-white transition-colors",
        className
      )}
      {...props}
    />
  );
}

/** Destructive button — for delete actions. */
export function CultivateButtonDestructive({ className, ...props }: CultivateButtonProps) {
  return (
    <Button
      variant="destructive"
      className={cn("transition-colors", className)}
      {...props}
    />
  );
}

// ============================================================================
// CARDS
// ============================================================================

interface CultivateCardProps extends React.ComponentPropsWithoutRef<typeof Card> {}

/** Standard light card. */
export function CultivateCard({ className, ...props }: CultivateCardProps) {
  return (
    <Card
      className={cn("border-gray-200 shadow-sm hover:shadow-md transition-shadow", className)}
      {...props}
    />
  );
}

/** Dark card for the chat/dashboard dark theme. */
export function CultivateDarkCard({ className, ...props }: CultivateCardProps) {
  return (
    <Card
      className={cn("bg-cultivate-bg-elevated border-cultivate-border-element text-white", className)}
      {...props}
    />
  );
}

// ============================================================================
// FORM INPUTS
// ============================================================================

/** Text input with Cultivate focus ring. */
export function CultivateInput({ className, ...props }: React.ComponentPropsWithoutRef<typeof Input>) {
  return (
    <Input
      className={cn(
        "border-gray-300 focus:border-cultivate-green-dark focus:ring-cultivate-green-dark focus:ring-offset-0 focus:ring-2",
        className
      )}
      {...props}
    />
  );
}

/** Textarea with Cultivate focus ring. */
export function CultivateTextarea({ className, ...props }: React.ComponentPropsWithoutRef<typeof Textarea>) {
  return (
    <Textarea
      className={cn(
        "border-gray-300 focus:border-cultivate-green-dark focus:ring-cultivate-green-dark focus:ring-offset-0 focus:ring-2",
        className
      )}
      {...props}
    />
  );
}

// ============================================================================
// 2. CUSTOM CULTIVATE COMPONENTS
// ============================================================================

export { default as Dropdown } from "@/components/dropdown";
export type { DropdownOption, DropdownProps } from "@/components/dropdown";

export { Tooltip } from "@/components/tooltip";

export { default as GlassCircleButton } from "@/components/glass-circle-button";

export { WaveIcon, AnimatedDots } from "@/components/wave-icon";

export { CabbageIcon, PaperPlaneIcon, SproutIcon, SEND_ICONS } from "@/components/send-icons";

export {
  Skeleton,
  AgentListSkeleton,
  DocumentListSkeleton,
  FlaggedListSkeleton,
  ConversationListSkeleton,
} from "@/components/skeleton";

// ============================================================================
// 3. SHADCN PRIMITIVES (no restyling needed)
// ============================================================================

export { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
export { Label } from "@/components/ui/label";
export {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
export {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
