import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FLOnboard1, FLOnboard2, FLOnboard3, FLOnboard4, FLOnboard5, FLOnboard6 } from '../components/Onboarding/steps'
import { api } from '../lib/api'

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const navigate = useNavigate()

  // Each step's save handler — receives data from the step, calls the API, then advances
  const handlers = [
    // Step 1 — intro, no data
    async () => setStep(1),
    // Step 2 — domains
    async (domains) => {
      await api.settings.domains(domains.map(d => ({ domain: d, category: '' })))
      setStep(2)
    },
    // Step 3 — schedule
    async (schedule) => {
      await api.settings.schedule(schedule)
      setStep(3)
    },
    // Step 4 — partner
    async ({ name, email }) => {
      await api.settings.partner({ name, email })
      setStep(4)
    },
    // Step 5 — grace
    async ({ graceWindowMin, dailyUnlockMax }) => {
      await api.settings.grace({ graceWindowMin, dailyUnlockMax })
      setStep(5)
    },
    // Step 6 — done
    async () => navigate('/'),
  ]

  const STEPS = [FLOnboard1, FLOnboard2, FLOnboard3, FLOnboard4, FLOnboard5, FLOnboard6]
  const Step  = STEPS[step]

  return (
    <div style={{ height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Step onNext={handlers[step]} />
      </div>
    </div>
  )
}
