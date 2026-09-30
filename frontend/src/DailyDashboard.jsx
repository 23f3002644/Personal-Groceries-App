import { useEffect, useState } from 'react'
import './DailyDashboard.css'

function getToday() {
  const today = new Date()
  const offset = today.getTimezoneOffset()
  return new Date(today.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

function formatMoney(value) {
  return `₹${Number(value || 0).toFixed(2)}`
}

function DailyDashboard({ catalogItems, categories }) {
  const [date, setDate] = useState(getToday)
  const [budget, setBudget] = useState('')
  const [planRows, setPlanRows] = useState([])
  const [history, setHistory] = useState([])
  const [selectedItemId, setSelectedItemId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [priority, setPriority] = useState('Medium')
  const [plan, setPlan] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let isCurrent = true

    async function loadPlan() {
      setIsLoading(true)
      setError('')
      setNotice('')

      try {
        const [planResponse, historyResponse] = await Promise.all([
          fetch(`/api/plans?date=${encodeURIComponent(date)}`),
          fetch('/api/plans'),
        ])
        const planResult = await planResponse.json()
        const historyResult = await historyResponse.json()

        if (!planResponse.ok || !historyResponse.ok || !Array.isArray(historyResult)) {
          throw new Error('Could not load daily purchase records.')
        }
        if (isCurrent) {
          setPlan(planResult)
          setBudget(planResult ? String(planResult.budget) : '')
          setPlanRows(planResult?.items || [])
          setHistory(historyResult)
          setIsDirty(false)
        }
      } catch (loadError) {
        if (isCurrent) {
          setError(loadError.message || 'Could not connect to the server.')
          setPlan(null)
          setPlanRows([])
        }
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    loadPlan()
    return () => {
      isCurrent = false
    }
  }, [date])

  const pendingRows = planRows.filter((row) => row.status !== 'purchased')
  const purchasedTotal = planRows
    .filter((row) => row.status === 'purchased')
    .reduce((total, row) => total + row.unitPrice * row.quantity, 0)
  const budgetValue = Number(budget) || 0
  let available = Math.max(0, budgetValue - purchasedTotal)
  const pendingCost = pendingRows.reduce(
    (total, row) => total + row.unitPrice * row.quantity,
    0
  )
  const recommendations = new Map()
  const orderedPending = pendingRows
    .map((row, index) => ({ row, index }))
    .sort((first, second) => {
      const priorities = { High: 0, Medium: 1, Low: 2 }
      return priorities[first.row.priority] - priorities[second.row.priority] ||
        first.index - second.index
    })

  for (const { row } of orderedPending) {
    const cost = row.unitPrice * row.quantity
    if (cost <= available) {
      recommendations.set(String(row._id || row.clientKey), true)
      available -= cost
    } else {
      recommendations.set(String(row._id || row.clientKey), false)
    }
  }

  const recommendedTotal = pendingRows.reduce((total, row) => {
    return recommendations.get(String(row._id || row.clientKey))
      ? total + row.unitPrice * row.quantity
      : total
  }, 0)
  const deferredRows = pendingRows.filter(
    (row) => !recommendations.get(String(row._id || row.clientKey))
  )
  const extraNeeded = Math.max(0, pendingCost - Math.max(0, budgetValue - purchasedTotal))
  const remainingAfterRecommendations = Math.max(
    0,
    budgetValue - purchasedTotal - recommendedTotal
  )

  function updateRow(rowId, updates) {
    setPlanRows((currentRows) =>
      currentRows.map((row) =>
        String(row._id || row.clientKey) === String(rowId) ? { ...row, ...updates } : row
      )
    )
    setIsDirty(true)
  }

  function addPlanItem(event) {
    event.preventDefault()
    setError('')
    const item = catalogItems.find((catalogItem) => catalogItem._id === selectedItemId)
    const parsedQuantity = Number(quantity)

    if (!item) {
      setError('Choose an item from the catalog.')
      return
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError('Quantity must be greater than zero.')
      return
    }
    if (planRows.some((row) => String(row.itemId) === String(item._id))) {
      setError('That item is already in this day’s plan. Edit its quantity below.')
      return
    }

    setPlanRows((currentRows) => [
      ...currentRows,
      {
        clientKey: `new-${Date.now()}`,
        itemId: item._id,
        itemName: item.title,
        categoryName:
          categories.find((category) => category._id === item.categoryId)?.name || '',
        unitPrice: item.basePricePerUnit ?? 0,
        quantity: parsedQuantity,
        priority,
        status: 'pending',
      },
    ])
    setIsDirty(true)
    setSelectedItemId('')
    setQuantity('1')
    setPriority('Medium')
  }

  async function savePlan() {
    const parsedBudget = Number(budget)
    if (budget === '' || !Number.isFinite(parsedBudget) || parsedBudget < 0) {
      setError('Enter a valid, non-negative daily budget.')
      return
    }
    if (planRows.some((row) => !Number.isFinite(Number(row.quantity)) || Number(row.quantity) <= 0)) {
      setError('Every planned quantity must be greater than zero.')
      return
    }

    setIsSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(`/api/plans/${encodeURIComponent(date)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget: parsedBudget,
          items: planRows.map((row) => ({
            itemId: row.itemId,
            quantity: Number(row.quantity),
            priority: row.priority,
          })),
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.message || 'Could not save the daily plan.')
      }
      setPlan(result)
      setPlanRows(result.items || [])
      setIsDirty(false)
      setNotice('Daily plan saved.')
      setHistory((currentHistory) => [
        result,
        ...currentHistory.filter((entry) => entry.date !== result.date),
      ].sort((first, second) => second.date.localeCompare(first.date)))
    } catch (saveError) {
      setError(saveError.message || 'Could not connect to the server.')
    } finally {
      setIsSaving(false)
    }
  }

  async function togglePurchased(row) {
    if (isDirty || !plan?._id || !row._id) {
      setError('Save this daily plan before updating purchase status.')
      return
    }

    setError('')
    try {
      const response = await fetch(
        `/api/plans/${encodeURIComponent(date)}/items/${row._id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: row.status === 'purchased' ? 'pending' : 'purchased',
          }),
        }
      )
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.message || 'Could not update purchase status.')
      }
      setPlan(result)
      setPlanRows(result.items || [])
      setHistory((currentHistory) =>
        currentHistory.map((entry) => (entry.date === result.date ? result : entry))
      )
    } catch (statusError) {
      setError(statusError.message || 'Could not update purchase status.')
    }
  }

  function removePlanItem(rowId) {
    setPlanRows((currentRows) =>
      currentRows.filter((row) => String(row._id || row.clientKey) !== String(rowId))
    )
    setIsDirty(true)
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="items-eyebrow">PERSONAL GROCERIES</p>
          <h1>Daily purchase</h1>
        </div>
        <label className="date-picker">
          <span>Plan date</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
      </header>

      <section className="budget-band" aria-label="Daily budget summary">
        <label className="budget-input">
          <span>Available budget</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={budget}
            onChange={(event) => {
              setBudget(event.target.value)
              setIsDirty(true)
            }}
            placeholder="Enter amount"
          />
        </label>
        <div className="budget-metric">
          <span>Committed purchases</span>
          <strong>{formatMoney(purchasedTotal)}</strong>
        </div>
        <div className="budget-metric">
          <span>Recommended now</span>
          <strong>{formatMoney(recommendedTotal)}</strong>
        </div>
        <div className="budget-metric">
          <span>Left after recommendation</span>
          <strong>{formatMoney(remainingAfterRecommendations)}</strong>
        </div>
      </section>

      <div className="dashboard-columns">
        <section className="planner-section" aria-labelledby="planner-heading">
          <div className="section-heading">
            <div>
              <p className="items-eyebrow">BUILD YOUR LIST</p>
              <h2 id="planner-heading">Items for this date</h2>
            </div>
            <button type="button" className="save-plan-button" onClick={savePlan} disabled={isSaving || isLoading}>
              {isSaving ? 'Saving...' : isDirty ? 'Save daily plan' : plan ? 'Plan saved' : 'Save daily plan'}
            </button>
          </div>

          <form className="planned-item-form" onSubmit={addPlanItem}>
            <label>
              <span>Catalog item</span>
              <select
                value={selectedItemId}
                onChange={(event) => setSelectedItemId(event.target.value)}
                disabled={catalogItems.length === 0}
              >
                <option value="">Select item</option>
                {catalogItems.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.title} · {formatMoney(item.basePricePerUnit)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Quantity</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </label>
            <label>
              <span>Priority</span>
              <select value={priority} onChange={(event) => setPriority(event.target.value)}>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </label>
            <button type="submit" className="add-plan-item-button" disabled={!catalogItems.length}>
              Add to plan
            </button>
          </form>

          {error && <p className="dashboard-message is-error" role="alert">{error}</p>}
          {notice && <p className="dashboard-message is-success" role="status">{notice}</p>}
          {isLoading ? (
            <p className="dashboard-empty">Loading daily plan...</p>
          ) : planRows.length === 0 ? (
            <p className="dashboard-empty">No items planned for this date yet.</p>
          ) : (
            <div className="planned-list">
              {planRows.map((row) => {
                const key = String(row._id || row.clientKey)
                const isPurchased = row.status === 'purchased'
                const isRecommended = recommendations.get(key)
                const lineTotal = Number(row.unitPrice) * Number(row.quantity)

                return (
                  <article className={`planned-row ${isPurchased ? 'is-purchased' : ''}`} key={key}>
                    <label className="purchase-toggle">
                      <input
                        type="checkbox"
                        checked={isPurchased}
                        disabled={!plan?._id || isDirty || !row._id}
                        onChange={() => togglePurchased(row)}
                      />
                      <span className="visually-hidden">Mark {row.itemName} as purchased</span>
                    </label>
                    <div className="planned-item-main">
                      <div className="planned-item-title">
                        <strong>{row.itemName}</strong>
                        <span className={`recommendation-tag ${isPurchased ? 'tag-purchased' : isRecommended ? 'tag-buy' : 'tag-pending'}`}>
                          {isPurchased ? 'Purchased' : isRecommended ? 'Within budget' : 'Still needed'}
                        </span>
                      </div>
                      <span className="planned-item-meta">
                        {row.categoryName || 'Uncategorized'} · {formatMoney(row.unitPrice)} / unit
                      </span>
                    </div>
                    <label className="row-field">
                      <span>Qty</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={row.quantity}
                        onChange={(event) => updateRow(key, { quantity: event.target.value })}
                      />
                    </label>
                    <label className="row-field priority-field">
                      <span>Priority</span>
                      <select
                        value={row.priority}
                        onChange={(event) => updateRow(key, { priority: event.target.value })}
                      >
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </select>
                    </label>
                    <strong className="planned-line-total">{formatMoney(lineTotal)}</strong>
                    <button
                      type="button"
                      className="remove-plan-item"
                      aria-label={`Remove ${row.itemName} from plan`}
                      onClick={() => removePlanItem(key)}
                      title="Remove from plan"
                    >
                      ×
                    </button>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <aside className="insight-column">
          <section className="insight-section">
            <p className="items-eyebrow">BUDGET CHECK</p>
            <h2>Still to purchase</h2>
            {deferredRows.length === 0 ? (
              <p className="dashboard-empty">Everything planned fits within the available budget.</p>
            ) : (
              <>
                <ul className="deferred-list">
                  {deferredRows.map((row) => (
                    <li key={row._id || row.clientKey}>
                      <span>{row.itemName} <small>· {row.priority}</small></span>
                      <strong>{formatMoney(row.unitPrice * row.quantity)}</strong>
                    </li>
                  ))}
                </ul>
                <div className="extra-needed">
                  <span>More budget to cover all pending items</span>
                  <strong>{formatMoney(extraNeeded)}</strong>
                </div>
              </>
            )}
            <p className="optimization-note">Recommendations check higher-priority items first. If one does not fit, lower-priority items are still checked for a fit.</p>
          </section>

          <section className="insight-section history-section">
            <div className="section-heading history-heading">
              <div>
                <p className="items-eyebrow">SAVED RECORDS</p>
                <h2>Recent days</h2>
              </div>
            </div>
            {history.length === 0 ? (
              <p className="dashboard-empty">Saved daily plans will appear here.</p>
            ) : (
              <ul className="history-list">
                {history.map((entry) => (
                  <li key={entry._id}>
                    <button
                      type="button"
                      className={entry.date === date ? 'history-date is-current' : 'history-date'}
                      onClick={() => setDate(entry.date)}
                    >
                      <span>{entry.date}</span>
                      <small>{entry.items.length} items · budget {formatMoney(entry.budget)}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </main>
  )
}

export default DailyDashboard
