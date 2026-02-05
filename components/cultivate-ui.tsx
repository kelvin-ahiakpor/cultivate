/**
 * Cultivate Branded UI Components
 *
 * These are shadcn components pre-styled with Cultivate's brand colors.
 * Use these for consistent styling across the app.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ============================================================================
// BUTTONS
// ============================================================================

interface CultivateButtonProps extends React.ComponentPropsWithoutRef<typeof Button> {}

/**
 * Primary action button with Cultivate green
 * Usage: <CultivateButton>Create Agent</CultivateButton>
 */
export function CultivateButton({ className, ...props }: CultivateButtonProps) {
  return (
    <Button
      className={cn(
        "bg-[#536d3d] hover:bg-[#3d5229] text-white font-medium transition-colors",
        className
      )}
      {...props}
    />
  );
}

/**
 * Secondary button with light green
 * Usage: <CultivateButtonSecondary>Cancel</CultivateButtonSecondary>
 */
export function CultivateButtonSecondary({ className, ...props }: CultivateButtonProps) {
  return (
    <Button
      variant="outline"
      className={cn(
        "border-[#536d3d] text-[#536d3d] hover:bg-[#536d3d] hover:text-white transition-colors",
        className
      )}
      {...props}
    />
  );
}

/**
 * Destructive button (for delete actions)
 * Usage: <CultivateButtonDestructive>Delete</CultivateButtonDestructive>
 */
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

/**
 * Standard card with Cultivate styling
 * Usage: <CultivateCard><CardHeader>...</CardHeader></CultivateCard>
 */
export function CultivateCard({ className, ...props }: CultivateCardProps) {
  return (
    <Card
      className={cn(
        "border-gray-200 shadow-sm hover:shadow-md transition-shadow",
        className
      )}
      {...props}
    />
  );
}

/**
 * Dark card for chat/dashboard dark theme
 * Usage: <CultivateDarkCard>...</CultivateDarkCard>
 */
export function CultivateDarkCard({ className, ...props }: CultivateCardProps) {
  return (
    <Card
      className={cn(
        "bg-[#2B2B2B] border-[#3B3B3B] text-white",
        className
      )}
      {...props}
    />
  );
}

// ============================================================================
// FORM INPUTS
// ============================================================================

interface CultivateInputProps extends React.ComponentPropsWithoutRef<typeof Input> {}

/**
 * Input with Cultivate focus colors
 * Usage: <CultivateInput placeholder="Enter name" />
 */
export function CultivateInput({ className, ...props }: CultivateInputProps) {
  return (
    <Input
      className={cn(
        "border-gray-300 focus:border-[#536d3d] focus:ring-[#536d3d] focus:ring-offset-0 focus:ring-2",
        className
      )}
      {...props}
    />
  );
}

/**
 * Textarea with Cultivate focus colors
 * Usage: <CultivateTextarea placeholder="Enter description" />
 */
export function CultivateTextarea({ className, ...props }: React.ComponentPropsWithoutRef<typeof Textarea>) {
  return (
    <Textarea
      className={cn(
        "border-gray-300 focus:border-[#536d3d] focus:ring-[#536d3d] focus:ring-offset-0 focus:ring-2",
        className
      )}
      {...props}
    />
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

// Re-export shadcn components that don't need styling
export { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
export { Label } from "@/components/ui/label";
export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
export { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
