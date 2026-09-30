import { useState } from 'react'

function AddCategory({
  categories = [],
  onCategoryCreated,
  onCategoryUpdated,
  onCategoryDeleted,
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [editingName, setEditingName] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Enter a category name.')
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result.message || 'Could not save the category.')
      }

      onCategoryCreated(result)
      setName('')
      setSuccess('Category saved.')
    } catch (requestError) {
      setError(requestError.message || 'Could not connect to the server.')
    } finally {
      setIsSaving(false)
    }
  }

  async function saveCategoryEdit(categoryId) {
    const trimmedName = editingName.trim()
    if (!trimmedName) {
      setError('Category name must not be empty.')
      return
    }

    setError('')
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.message || 'Could not update category.')
      }
      onCategoryUpdated(result)
      setEditingId('')
      setSuccess('Category updated.')
    } catch (requestError) {
      setError(requestError.message || 'Could not update category.')
    }
  }

  async function deleteCategory(categoryId) {
    setError('')
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.message || 'Could not delete category.')
      }
      onCategoryDeleted(categoryId)
      setSuccess('Category deleted.')
    } catch (requestError) {
      setError(requestError.message || 'Could not delete category.')
    }
  }

  return (
    <section className="category-panel" aria-labelledby="category-heading">
      <p className="items-eyebrow">ORGANIZE YOUR ITEMS</p>
      <h2 id="category-heading">Add a category</h2>
      <p className="items-intro">Create a group for related grocery items.</p>

      <form className="items-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="category-name">Category name</label>
        <input
          id="category-name"
          name="name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="For example, Produce"
          autoComplete="off"
          aria-invalid={Boolean(error && !name.trim())}
          aria-describedby="category-feedback"
        />
        <button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save category'}
        </button>
        <p
          id="category-feedback"
          className={error ? 'items-feedback is-error' : 'items-feedback is-success'}
          role={error ? 'alert' : 'status'}
          aria-live="polite"
        >
          {error || success}
        </p>
      </form>

      <div className="catalog-list" aria-label="Saved categories">
        <h3>Categories</h3>
        {categories.length === 0 ? (
          <p className="empty-list">No categories yet.</p>
        ) : (
          <ul>
            {categories.map((category) => (
              <li key={category._id}>
                {editingId === category._id ? (
                  <div className="edit-row">
                    <input
                      aria-label="Edit category name"
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                    />
                    <button type="button" onClick={() => saveCategoryEdit(category._id)}>
                      Save
                    </button>
                    <button type="button" className="quiet-button" onClick={() => setEditingId('')}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span>{category.name}</span>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="quiet-button"
                        onClick={() => {
                          setEditingId(category._id)
                          setEditingName(category.name)
                          setError('')
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => deleteCategory(category._id)}
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

export default AddCategory
