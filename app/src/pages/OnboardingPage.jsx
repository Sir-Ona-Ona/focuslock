import { useState } from 'react'
import { FLOnboard1, FLOnboard2, FLOnboard3, FLOnboard4, FLOnboard5, FLOnboard6 } from '../components/Onboarding/steps'

const STEPS = [FLOnboard1, FLOnboard2, FLOnboard3, FLOnboard4, FLOnboard5, FLOnboard6]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const Step = STEPS[step]

  return (
    <div style={{ height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Step onNext={() => setStep(s => Math.min(s + 1, STEPS.length - 1))} />
      </div>
    </div>
  )
}
