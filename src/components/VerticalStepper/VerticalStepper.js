import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useInView } from 'react-intersection-observer';

// Step component handles individual steps within the stepper
const Step = ({ children, isActive, onVisibilityChange, iconClass, index }) => {
  const { ref, inView } = useInView({
    threshold: 0.5  // Adjust based on how much of the element should be visible to trigger active state
  });

  useEffect(() => {
    // Notify parent component of visibility change
    onVisibilityChange(inView);
  }, [inView, onVisibilityChange]);

  // Render the step with conditional styling based on active state
  return (
    <li ref={ref} className={`mb-10 ms-6 ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
      <span className={`absolute flex items-center justify-center w-8 h-8 rounded-full -start-4 ring-4 ring-white ${isActive ? 'bg-green-200 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-700'}`}
           aria-current={isActive ? 'step' : undefined}>
        <i className={iconClass}></i>
      </span>
      {children}
    </li>
  );
};

// PropTypes for Step component
Step.propTypes = {
  children: PropTypes.node.isRequired,
  isActive: PropTypes.bool.isRequired,
  onVisibilityChange: PropTypes.func.isRequired,
  iconClass: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
};

// VerticalStepper manages the collection of steps and their active state
const VerticalStepper = ({ steps }) => {
  const [visibleSteps, setVisibleSteps] = useState(new Array(steps.length).fill(false));

  // Update visibility only if there's a change
  const handleVisibilityChange = (index, isVisible) => {
    setVisibleSteps(prev => {
      // Only update state if visibility has actually changed
      if (prev[index] === isVisible) {
        return prev; // return the current state if there's no change
      }
      const newVisibility = [...prev];
      newVisibility[index] = isVisible;
      return newVisibility;
    });
  };

  // Determine the most recently visible step to be the active one
  const activeStep = visibleSteps.lastIndexOf(true);

  if (steps.length === 0) {
    return <p>No steps available</p>; // Handle no steps case
  }

  return (
    <ol className="relative border-s border-gray-200 dark:border-gray-700">
      {steps.map((step, index) => (
        <Step
          key={index}
          index={index}
          isActive={index === activeStep}
          onVisibilityChange={(isVisible) => handleVisibilityChange(index, isVisible)}
          iconClass={step.iconClass}
          {...step}
        >
          <h3 className="text-xl font-medium leading-tight">{step.title}</h3>
          <p className="text-sm pb-2">{step.content}</p>
          {step.component}
        </Step>
      ))}
    </ol>
  );
};


// PropTypes for VerticalStepper component
VerticalStepper.propTypes = {
  steps: PropTypes.arrayOf(PropTypes.shape({
    title: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    component: PropTypes.node,
    iconClass: PropTypes.string.isRequired,
  })).isRequired,
};

export default VerticalStepper;
