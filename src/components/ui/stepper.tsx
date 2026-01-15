'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

// =============================================================================
// TYPES
// =============================================================================

export interface Step {
  id: string;
  title: string;
  description?: string;
}

interface StepperContextValue {
  steps: Step[];
  currentStep: number;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  canGoNext: boolean;
  setCanGoNext: (can: boolean) => void;
}

const StepperContext = React.createContext<StepperContextValue | null>(null);

export function useStepper() {
  const context = React.useContext(StepperContext);
  if (!context) {
    throw new Error('useStepper must be used within a StepperProvider');
  }
  return context;
}

// =============================================================================
// STEPPER ROOT
// =============================================================================

interface StepperProps {
  steps: Step[];
  initialStep?: number;
  onComplete?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Stepper({
  steps,
  initialStep = 0,
  onComplete,
  children,
  className,
}: StepperProps) {
  const [currentStep, setCurrentStep] = React.useState(initialStep);
  const [canGoNext, setCanGoNext] = React.useState(true);

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const goToStep = React.useCallback((step: number) => {
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step);
    }
  }, [steps.length]);

  const nextStep = React.useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentStep, steps.length, onComplete]);

  const prevStep = React.useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const value = React.useMemo(
    () => ({
      steps,
      currentStep,
      goToStep,
      nextStep,
      prevStep,
      isFirstStep,
      isLastStep,
      canGoNext,
      setCanGoNext,
    }),
    [steps, currentStep, goToStep, nextStep, prevStep, isFirstStep, isLastStep, canGoNext]
  );

  return (
    <StepperContext.Provider value={value}>
      <div className={cn('flex flex-col', className)}>
        {children}
      </div>
    </StepperContext.Provider>
  );
}

// =============================================================================
// STEP INDICATOR
// =============================================================================

interface StepIndicatorProps {
  className?: string;
  variant?: 'default' | 'compact';
}

export function StepIndicator({ className, variant = 'default' }: StepIndicatorProps) {
  const { steps, currentStep, goToStep } = useStepper();

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center justify-center gap-1.5', className)}>
        {steps.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => index < currentStep && goToStep(index)}
            disabled={index > currentStep}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              index === currentStep
                ? 'w-6 bg-primary'
                : index < currentStep
                ? 'w-1.5 bg-primary/60 cursor-pointer hover:bg-primary/80'
                : 'w-1.5 bg-muted-foreground/30'
            )}
            aria-label={`Step ${index + 1}: ${steps[index].title}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center justify-between', className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <React.Fragment key={step.id}>
            {/* Step Circle */}
            <button
              type="button"
              onClick={() => isCompleted && goToStep(index)}
              disabled={!isCompleted}
              className={cn(
                'relative flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all duration-200',
                isCompleted && 'bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90',
                isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
              )}
            >
              {isCompleted ? (
                <Check className="h-4 w-4" />
              ) : (
                <span>{index + 1}</span>
              )}
            </button>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="flex-1 mx-2 h-0.5 bg-muted overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: '0%' }}
                  animate={{ width: index < currentStep ? '100%' : '0%' }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// =============================================================================
// STEP HEADER (Title + Description for current step)
// =============================================================================

interface StepHeaderProps {
  className?: string;
}

export function StepHeader({ className }: StepHeaderProps) {
  const { steps, currentStep } = useStepper();
  const step = steps[currentStep];

  return (
    <div className={cn('text-center', className)}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <h3 className="text-lg font-semibold">{step.title}</h3>
          {step.description && (
            <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// STEP CONTENT (Animated container for step content)
// =============================================================================

interface StepContentProps {
  children: React.ReactNode;
  className?: string;
}

export function StepContent({ children, className }: StepContentProps) {
  const { currentStep } = useStepper();

  // Convert children to array and get current step's content
  const childArray = React.Children.toArray(children);
  const currentContent = childArray[currentStep];

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="p-1" // Padding to prevent focus ring clipping
        >
          {currentContent}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// STEP ITEM (Wrapper for individual step content)
// =============================================================================

interface StepItemProps {
  children: React.ReactNode;
  className?: string;
}

export function StepItem({ children, className }: StepItemProps) {
  return <div className={className}>{children}</div>;
}

// =============================================================================
// STEP NAVIGATION (Back/Next buttons)
// =============================================================================

interface StepNavigationProps {
  className?: string;
  onCancel?: () => void;
  nextLabel?: string;
  backLabel?: string;
  completeLabel?: string;
  showCancel?: boolean;
  isSubmitting?: boolean;
  /** Additional content to render on the left side (e.g., delete button) */
  leftContent?: React.ReactNode;
}

export function StepNavigation({
  className,
  onCancel,
  nextLabel = 'Continue',
  backLabel = 'Back',
  completeLabel = 'Complete',
  showCancel = true,
  isSubmitting = false,
  leftContent,
}: StepNavigationProps) {
  const { nextStep, prevStep, isFirstStep, isLastStep, canGoNext } = useStepper();

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    nextStep();
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    prevStep();
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {leftContent}
      
      {!isFirstStep && (
        <button
          type="button"
          onClick={handlePrev}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors px-3 py-1.5 rounded-full"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </button>
      )}
      
      <div className="flex-1" />
      
      {isFirstStep && showCancel && onCancel && (
        <Button type="button" variant="muted" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      )}
      
      {/* Separate buttons for next vs submit to avoid type switching issues */}
      {isLastStep ? (
        <Button
          type="submit"
          disabled={!canGoNext || isSubmitting}
          className="rounded-full"
        >
          {isSubmitting ? 'Saving...' : completeLabel}
        </Button>
      ) : (
        <Button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext}
          className="rounded-full"
        >
          {nextLabel}
        </Button>
      )}
    </div>
  );
}

