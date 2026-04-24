"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Search, Pencil, Trash2, X, Eye } from "lucide-react"
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/db/localApi"
import { SaveButton } from "@/components/ui/save-button"
import {
  getActiveCatalogItems,
  initialProductCatalog,
} from "@/lib/catalog/product-catalog"

const TYPE_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "productType", label: "Tipo de Producto" },
  { value: "category", label: "Categoría" },
]

const FORM_DEFAULTS = {
  name: "",
  description: "",
  type: "category",
  status: "active",
}

const TYPE_LABELS = {
  productType: "Tipo de Producto",
  category: "Categoría",
}

const STATUS_LABELS = {
  active: "Activo",
  inactive: "Inactivo",
}

const STATUS_BADGES = {
  active: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  inactive: "bg-gray-100 text-gray-600 ring-gray-200",
}

function getNextId(items) {
  return items.reduce((maxId, item) => Math.max(maxId, Number(item.id) || 0), 0) + 1
}

function normalizeText(value) {
  return String(value || "").trim()
}

function areSameNameAndType(left, rightName, rightType) {
  return left.type === rightType && left.name.trim().toLowerCase() === rightName.trim().toLowerCase()
}

function CatalogFormModal({ open, item, readOnly, saving = false, existingItems, onCancel, onSave }) {
  const [form, setForm] = useState(FORM_DEFAULTS)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!open) {
      return
    }

    setForm(
      item
        ? {
            name: item.name,
            description: item.description || "",
            type: item.type,
            status: item.status,
          }
        : FORM_DEFAULTS,
    )
    setErrors({})
  }, [open, item])

  if (!open) {
    return null
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (readOnly) {
      onCancel()
      return
    }

    const nextErrors = {}
    const name = normalizeText(form.name)

    if (!name) {
      nextErrors.name = "El nombre es obligatorio"
    }

    if (!form.type) {
      nextErrors.type = "Selecciona un tipo"
    }

    if (!form.status) {
      nextErrors.status = "Selecciona un estatus"
    }

    const duplicateExists = (existingItems || []).some((existing) => {
      if (item && existing.id === item.id) {
        return false
      }

      return areSameNameAndType(existing, name, form.type)
    })

    if (duplicateExists) {
      nextErrors.name = "Ya existe un registro con ese nombre dentro del mismo tipo"
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    onSave({
      ...form,
      name,
      description: normalizeText(form.description),
    })
  }

  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{item ? "Editar elemento" : "Nuevo elemento"}</h2>
            <p className="text-sm text-gray-500">{readOnly ? "Vista de solo lectura" : "Completa los datos del catálogo"}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Nombre *</label>
            <input
              type="text"
              value={form.name}
              onChange={handleChange("name")}
              disabled={readOnly}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-200 disabled:bg-gray-100"
              placeholder="Ej. Materiales"
            />
            {errors.name ? <p className="text-sm text-red-600">{errors.name}</p> : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Descripción</label>
            <textarea
              value={form.description}
              onChange={handleChange("description")}
              disabled={readOnly}
              rows={4}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-200 disabled:bg-gray-100"
              placeholder="Descripción opcional"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Tipo *</label>
              <select
                value={form.type}
                onChange={handleChange("type")}
                disabled={readOnly}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-200 disabled:bg-gray-100"
              >
                <option value="productType">Tipo de Producto</option>
                <option value="category">Categoría</option>
              </select>
              {errors.type ? <p className="text-sm text-red-600">{errors.type}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Estatus *</label>
              <select
                value={form.status}
                onChange={handleChange("status")}
                disabled={readOnly}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-200 disabled:bg-gray-100"
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
              {errors.status ? <p className="text-sm text-red-600">{errors.status}</p> : null}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <SaveButton
              isLoading={saving}
              disabled={readOnly}
              className="h-auto rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-900"
            />
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteConfirmDialog({ open, item, onCancel, onConfirm }) {
  if (!open || !item) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Eliminar registro</h2>
        <p className="mt-2 text-sm text-gray-600">
          ¿Seguro que deseas eliminar <span className="font-medium text-gray-900">{item.name}</span>? Esta acción no se puede deshacer.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProductCatalogPage({ userRole = "viewer" }) {
  const [catalog, setCatalog] = useState(initialProductCatalog)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [readOnlyView, setReadOnlyView] = useState(false)
  const [saving, setSaving] = useState(false)
  const isAdmin = userRole === "admin"

  useEffect(() => {
    let mounted = true

    const fetchCatalog = async () => {
      try {
        const data = await apiGet("/product-catalog")
        if (mounted) {
          setCatalog(Array.isArray(data) && data.length > 0 ? data : initialProductCatalog)
        }
      } catch (error) {
        console.error("Error cargando catálogo:", error)
        if (mounted) {
          setCatalog(initialProductCatalog)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchCatalog()

    return () => {
      mounted = false
    }
  }, [])

  const filteredCatalog = catalog
    .filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
      const matchesType = filterType === "all" || item.type === filterType
      const matchesStatus = statusFilter === "all" || item.status === statusFilter
      return matchesSearch && matchesType && matchesStatus
    })
    .sort((a, b) => a.name.localeCompare(b.name, "es"))

  const activeCatalog = getActiveCatalogItems(catalog)
  const inactiveCatalog = catalog.filter((item) => item.status === "inactive")
  const activeTypes = getActiveCatalogItems(catalog, "productType")
  const activeCategories = getActiveCatalogItems(catalog, "category")

  const openCreateModal = () => {
    setEditingItem(null)
    setReadOnlyView(false)
    setFormOpen(true)
  }

  const openEditModal = (item) => {
    setEditingItem(item)
    setReadOnlyView(!isAdmin)
    setFormOpen(true)
  }

  const closeFormModal = () => {
    setFormOpen(false)
    setEditingItem(null)
    setReadOnlyView(false)
  }

  const handleSave = async (payload) => {
    if (saving) {
      return
    }

    const normalizedName = payload.name.trim()

    setSaving(true)
    try {
      if (editingItem) {
        const updated = await apiPatch(`/product-catalog/${editingItem.id}`, {
          name: normalizedName,
          description: payload.description || null,
          type: payload.type,
          status: payload.status,
        })
        setCatalog((current) => current.map((item) => (item.id === editingItem.id ? updated : item)))
      } else {
        const created = await apiPost("/product-catalog", {
          name: normalizedName,
          description: payload.description || null,
          type: payload.type,
          status: payload.status,
        })
        setCatalog((current) => [...current, created])
      }

      closeFormModal()
    } catch (error) {
      console.error("Error guardando catálogo:", error)
      alert(error?.message || "No se pudo guardar el registro")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    if (!deleteItem) {
      return
    }

    ;(async () => {
      try {
        await apiDelete(`/product-catalog/${deleteItem.id}`)
        setCatalog((current) => current.filter((item) => item.id !== deleteItem.id))
        setDeleteItem(null)
      } catch (error) {
        console.error("Error eliminando catálogo:", error)
        alert(error?.message || "No se pudo eliminar el registro")
      }
    })()
  }

  const handleExternalView = (item) => {
    setEditingItem(item)
    setReadOnlyView(true)
    setFormOpen(true)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
          Cargando catálogo...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Link
              href="/products"
              className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100"
              aria-label="Volver"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Catálogo de Tipos y Categorías</h1>
              <p className="mt-1 text-sm text-gray-600 sm:text-base">Administra tipos de producto y categorías para organizar y filtrar el catálogo.</p>
            </div>
          </div>

          {isAdmin ? (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo
            </button>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition ${
              statusFilter === "all" ? "border-gray-900 ring-2 ring-gray-200" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <p className="text-sm text-gray-500">Registros totales</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{catalog.length}</p>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition ${
              statusFilter === "active" ? "border-gray-900 ring-2 ring-gray-200" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <p className="text-sm text-gray-500">Activos</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{activeCatalog.length}</p>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("inactive")}
            className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition ${
              statusFilter === "inactive" ? "border-gray-900 ring-2 ring-gray-200" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <p className="text-sm text-gray-500">Inactivos</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{inactiveCatalog.length}</p>
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre"
                className="w-full rounded-xl border border-gray-300 bg-white px-10 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <select
              value={filterType}
              onChange={(event) => setFilterType(event.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Descripción</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Estatus</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredCatalog.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">
                      No se encontraron registros
                    </td>
                  </tr>
                ) : (
                  filteredCatalog.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50/80 hover:bg-gray-100"}>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{item.description || "—"}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{TYPE_LABELS[item.type]}</td>
                      <td className="px-4 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ${STATUS_BADGES[item.status]}`}>
                          {STATUS_LABELS[item.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {isAdmin ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-700 transition hover:bg-gray-50"
                              aria-label="Editar"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteItem(item)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50"
                              aria-label="Eliminar"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleExternalView(item)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-700 transition hover:bg-gray-50"
                            aria-label="Ver"
                            title="Ver"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-900">
          <p className="font-medium">Selección para otros módulos</p>
          <p className="mt-1 text-gray-700">
            Los selects reutilizan solo los registros con estatus activo. Activos disponibles: {activeTypes.length} tipos y {activeCategories.length} categorías.
          </p>
        </div>
      </div>

      <CatalogFormModal
        open={formOpen}
        item={editingItem}
        readOnly={readOnlyView}
        saving={saving}
        existingItems={catalog}
        onCancel={closeFormModal}
        onSave={handleSave}
      />
      <DeleteConfirmDialog open={Boolean(deleteItem)} item={deleteItem} onCancel={() => setDeleteItem(null)} onConfirm={handleDelete} />
    </div>
  )
}

export { CatalogFormModal, DeleteConfirmDialog, TYPE_LABELS, STATUS_LABELS, initialProductCatalog }