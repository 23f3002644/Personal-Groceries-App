import { useEffect, useState } from 'react'
import AddCategory from './AddCategory.jsx'
import DailyDashboard from './DailyDashboard.jsx'
import { apiFetch } from './api.js'
import './AddItems.css'

function App() {
  const [activeView, setActiveView] = useState('dashboard')
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState('')

  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await apiFetch('/api/categories')
        const result = await response.json().catch(() => null)

        if (!response.ok || !Array.isArray(result)) {
          throw new Error('Could not load categories.')
        }

        setCategories(result)

        const itemsResponse = await apiFetch('/api/tasks')
        const itemsResult = await itemsResponse.json().catch(() => null)
        if (!itemsResponse.ok || !Array.isArray(itemsResult)) {
          throw new Error('Could not load items.')
        }
        setItems(itemsResult)
      } catch (error) {
        setCategoriesError(error.message || 'Could not load categories.')
      } finally {
        setCategoriesLoading(false)
      }
    }

    loadCategories()
  }, [])

  function addCategory(category) {
    setCategories((currentCategories) => {
      const updatedCategories = [
        ...currentCategories.filter((item) => item._id !== category._id),
        category,
      ]
      return updatedCategories.sort((first, second) =>
        first.name.localeCompare(second.name)
      )
    })
  }

  function updateCategory(category) {
    setCategories((currentCategories) =>
      currentCategories
        .map((item) => (item._id === category._id ? category : item))
        .sort((first, second) => first.name.localeCompare(second.name))
    )
  }

  function deleteCategory(categoryId) {
    setCategories((currentCategories) =>
      currentCategories.filter((category) => category._id !== categoryId)
    )
  }

  return (
    <>
      <nav className="app-nav" aria-label="Main navigation">
        <span className="app-wordmark">Groceries</span>
        <div role="tablist" aria-label="Application views">
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'dashboard'}
            className={activeView === 'dashboard' ? 'is-active' : ''}
            onClick={() => setActiveView('dashboard')}
          >
            Daily plan
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'catalog'}
            className={activeView === 'catalog' ? 'is-active' : ''}
            onClick={() => setActiveView('catalog')}
          >
            Catalog
          </button>
        </div>
      </nav>
      {activeView === 'dashboard' ? (
        <DailyDashboard catalogItems={items} categories={categories} />
      ) : (
        <main className="catalog-page">
          <header className="catalog-header">
            <p className="items-eyebrow">PERSONAL GROCERIES</p>
            <h1>Item catalog</h1>
          </header>
          <div className="catalog-forms">
            <AddCategory
              categories={categories}
              onCategoryCreated={addCategory}
              onCategoryUpdated={updateCategory}
              onCategoryDeleted={deleteCategory}
            />
            <AddItems
              categories={categories}
              items={items}
              categoriesLoading={categoriesLoading}
              categoriesError={categoriesError}
              onItemCreated={(item) => setItems((currentItems) => [...currentItems, item])}
              onItemUpdated={(item) =>
                setItems((currentItems) =>
                  currentItems.map((currentItem) =>
                    currentItem._id === item._id ? item : currentItem
                  )
                )
              }
              onItemDeleted={(itemId) =>
                setItems((currentItems) => currentItems.filter((item) => item._id !== itemId))
              }
            />
          </div>
        </main>
      )}
    </>
  )
}

export default App

function AddItems({
  categories,
  items,
  categoriesLoading,
  categoriesError,
  onItemCreated,
  onItemUpdated,
  onItemDeleted,
}) {
  const [title, setTitle] = useState('')
  const [basePricePerUnit, setBasePricePerUnit] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [listError, setListError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const trimmedTitle = title.trim()
    const price = Number(basePricePerUnit)

    if (!trimmedTitle) {
      setError('Enter an item name.')
      return
    }

    if (basePricePerUnit === '' || !Number.isFinite(price) || price < 0) {
      setError('Enter a valid, non-negative price per unit.')
      return
    }

    if (!categoryId) {
      setError('Select a category for this item.')
      return
    }

    setIsSaving(true)

    try {
      const response = await apiFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmedTitle,
          basePricePerUnit: price,
          priority: 'Medium',
          categoryId,
        }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result.message || 'Could not save the item.')
      }

      setTitle('')
      setBasePricePerUnit('')
      setCategoryId('')
      onItemCreated(result)
      setSuccess('Item saved.')
    } catch (requestError) {
      setError(requestError.message || 'Could not connect to the server.')
    } finally {
      setIsSaving(false)
    }
  }

  async function saveItemEdit(event) {
    event.preventDefault()
    const trimmedTitle = editingItem.title.trim()
    const price = Number(editingItem.basePricePerUnit)

    if (!trimmedTitle) {
      setListError('Item name must not be empty.')
      return
    }
    if (editingItem.basePricePerUnit === '' || !Number.isFinite(price) || price < 0) {
      setListError('Enter a valid, non-negative price per unit.')
      return
    }
    if (!editingItem.categoryId) {
      setListError('Select a category for this item.')
      return
    }

    setListError('')
    try {
      const response = await apiFetch(`/api/tasks/${editingItem._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmedTitle,
          basePricePerUnit: price,
          categoryId: editingItem.categoryId,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.message || 'Could not update item.')
      }
      onItemUpdated(result)
      setEditingItem(null)
    } catch (requestError) {
      setListError(requestError.message || 'Could not update item.')
    }
  }

  async function deleteItem(itemId) {
    setListError('')
    try {
      const response = await apiFetch(`/api/tasks/${itemId}`, { method: 'DELETE' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.message || 'Could not remove item.')
      }
      onItemDeleted(itemId)
    } catch (requestError) {
      setListError(requestError.message || 'Could not remove item.')
    }
  }

  return (
    <section className="items-panel" aria-labelledby="items-heading">
        <h1 id="items-heading">Add an item</h1>
        <p className="items-intro">Add an item and its usual price per unit.</p>

        <form className="items-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="item-title">Item name</label>
          <input
            id="item-title"
            name="title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="For example, apples"
            autoComplete="off"
            aria-invalid={Boolean(error && !title.trim())}
            aria-describedby={error ? 'items-feedback' : undefined}
          />

          <label htmlFor="item-price">Base price per unit</label>
          <input
            id="item-price"
            name="basePricePerUnit"
            type="number"
            min="0"
            step="0.01"
            value={basePricePerUnit}
            onChange={(event) => setBasePricePerUnit(event.target.value)}
            placeholder="0.00"
            aria-describedby={error ? 'items-feedback' : undefined}
          />

          <label htmlFor="item-category">Category</label>
          <select
            id="item-category"
            name="categoryId"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            disabled={categoriesLoading || categories.length === 0}
            aria-describedby={categoriesError || error ? 'items-feedback' : undefined}
          >
            <option value="">
              {categoriesLoading ? 'Loading categories...' : 'Choose a category'}
            </option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>

          <button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save item'}
          </button>

          <p
            id="items-feedback"
            className={error ? 'items-feedback is-error' : 'items-feedback is-success'}
            role={error ? 'alert' : 'status'}
            aria-live="polite"
          >
            {error || categoriesError || success}
          </p>
        </form>

        <div className="catalog-list" aria-label="Saved items">
          <h3>Items</h3>
          {listError && <p className="items-feedback is-error" role="alert">{listError}</p>}
          {items.length === 0 ? (
            <p className="empty-list">No items yet.</p>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item._id}>
                  {editingItem?._id === item._id ? (
                    <form className="item-edit-form" onSubmit={saveItemEdit}>
                      <input
                        aria-label="Edit item name"
                        value={editingItem.title}
                        onChange={(event) =>
                          setEditingItem({ ...editingItem, title: event.target.value })
                        }
                      />
                      <input
                        aria-label="Edit base price per unit"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingItem.basePricePerUnit ?? ''}
                        onChange={(event) =>
                          setEditingItem({
                            ...editingItem,
                            basePricePerUnit: event.target.value,
                          })
                        }
                      />
                      <select
                        aria-label="Edit item category"
                        value={editingItem.categoryId}
                        onChange={(event) =>
                          setEditingItem({ ...editingItem, categoryId: event.target.value })
                        }
                      >
                        <option value="">Choose a category</option>
                        {categories.map((category) => (
                          <option key={category._id} value={category._id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <div className="row-actions">
                        <button type="submit">Save</button>
                        <button
                          type="button"
                          className="quiet-button"
                          onClick={() => setEditingItem(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="item-summary">
                        <strong>{item.title}</strong>
                        <span>
                          {categories.find((category) => category._id === item.categoryId)?.name ||
                            'Uncategorized'}
                          {' · '}
                          {Number(item.basePricePerUnit ?? 0).toFixed(2)} per unit
                        </span>
                      </div>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="quiet-button"
                          onClick={() => {
                            setListError('')
                            setEditingItem({
                              ...item,
                              categoryId: item.categoryId || '',
                              basePricePerUnit: String(item.basePricePerUnit ?? ''),
                            })
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => deleteItem(item._id)}
                        >
                          Remove
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
    </section>
  )
}
