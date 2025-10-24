// Core Types for Warehouse Management System

export type MovementType = "entrada" | "salida" | "ajuste" | "traspaso" | "transformacion"
export type ProductType =
  | "insumo"
  | "fruta"
  | "agua"
  | "polvos"
  | "materia-prima"
  | "producto-terminado"
  | "empaque"
  | "otro"
export type OrderStatus = "pendiente" | "parcial" | "completada" | "cancelada"
export type PaymentStatus = "pendiente" | "pagado" | "vencido" | "parcial"

export interface Warehouse {
  id: string
  name: string
  code: string
  location: string
  description?: string
  isActive: boolean
  zones?: WarehouseZone[]
  createdAt: Date
  updatedAt: Date
}

export interface WarehouseZone {
  id: string
  warehouseId: string
  name: string
  code: string
  aisles?: string[]
}

export interface Category {
  id: string
  name: string
  description?: string
  parentId?: string
  subcategories?: Category[]
}

export interface Product {
  id: string
  sku: string
  name: string
  description?: string
  type: ProductType
  categoryId: string
  category?: Category
  imageUrl?: string
  barcode?: string
  unitOfMeasure: string
  alternativeUnits?: UnitConversion[]
  equivalences?: ProductEquivalence[]
  costPrice: number
  salePrice: number
  minStock: number
  maxStock: number
  reorderPoint: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface UnitConversion {
  unit: string
  conversionFactor: number
}

export interface ProductEquivalence {
  productId: string
  equivalentProductId: string
  conversionFactor: number
  product?: Product
}

export interface Stock {
  id: string
  productId: string
  product?: Product
  warehouseId: string
  warehouse?: Warehouse
  quantity: number
  reservedQuantity: number
  availableQuantity: number
  zoneId?: string
  location?: string
  lotNumber?: string
  expirationDate?: Date
  lastMovementDate: Date
  updatedAt: Date
}

export interface Movement {
  id: string
  type: MovementType
  productId: string
  product?: Product
  warehouseId: string
  warehouse?: Warehouse
  quantity: number
  unitCost?: number
  totalCost?: number
  fromWarehouseId?: string
  toWarehouseId?: string
  lotNumber?: string
  expirationDate?: Date
  referenceType?: string
  referenceId?: string
  notes?: string
  userId: string
  userName: string
  createdAt: Date
}

export interface Supplier {
  id: string
  code: string
  name: string
  rfc: string
  address: string
  city: string
  state: string
  postalCode: string
  country?: string
  phone: string
  email: string
  contactName?: string
  businessType?: string
  paymentTerms: number
  active: boolean
  products?: ProductSupplier[]
  createdAt: Date
  updatedAt: Date
}

export interface ProductSupplier {
  id: string
  productId: string
  product?: Product
  supplierId: string
  supplier?: Supplier
  supplierSku?: string
  supplierPrice: number
  leadTimeDays: number
  minOrderQuantity: number
  isPreferred: boolean
}

export interface PurchaseOrder {
  id: string
  orderNumber: string
  supplierId: string
  supplier?: Supplier
  warehouseId: string
  warehouse?: Warehouse
  orderDate: Date
  expectedDeliveryDate: Date
  deliveryDate?: Date
  status: OrderStatus
  paymentStatus: PaymentStatus
  subtotal: number
  tax: number
  total: number
  creditDays: number
  dueDate: Date
  invoiceNumber?: string
  invoiceDate?: Date
  notes?: string
  items: PurchaseOrderItem[]
  userId: string
  userName: string
  createdAt: Date
  updatedAt: Date
}

export interface PurchaseOrderItem {
  id: string
  purchaseOrderId: string
  productId: string
  product?: Product
  quantity: number
  receivedQuantity: number
  unitPrice: number
  subtotal: number
  tax: number
  total: number
  lotNumber?: string
  expirationDate?: Date
}

export interface Audit {
  id: string
  warehouseId: string
  warehouse?: Warehouse
  auditDate: Date
  status: "en-progreso" | "completado" | "cancelado"
  items: AuditItem[]
  notes?: string
  userId: string
  userName: string
  createdAt: Date
  updatedAt: Date
}

export interface AuditItem {
  id: string
  auditId: string
  productId: string
  product?: Product
  systemQuantity: number
  physicalQuantity: number
  difference: number
  notes?: string
}

export interface Report {
  id: string
  type: "stock" | "movements" | "valuation" | "abc-analysis" | "expiration" | "low-stock"
  name: string
  parameters: Record<string, any>
  generatedAt: Date
  userId: string
  userName: string
}

export interface DashboardKPI {
  totalProducts: number
  totalValue: number
  lowStockProducts: number
  expiringProducts: number
  pendingOrders: number
  monthlyMovements: number
  topProducts: Array<{
    product: Product
    quantity: number
    value: number
  }>
  stockByWarehouse: Array<{
    warehouse: Warehouse
    totalValue: number
    productCount: number
  }>
}

// Producer module types
export type AccountMovementType = "asignacion" | "recepcion" | "ajuste" | "pago"
export type ShipmentStatus = "embarcada" | "en-transito" | "recibida" | "vendida"
export type PaymentMethod = "efectivo" | "transferencia" | "cheque" | "deposito"

export interface Producer {
  id: string
  code: string
  name: string
  rfc?: string
  address: string
  city: string
  state: string
  phone: string
  email?: string
  contactName: string
  accountBalance: number // Positive = we owe them, Negative = they owe us
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface InputAssignment {
  id: string
  assignmentNumber: string
  producerId: string
  producer?: Producer
  warehouseId: string
  warehouse?: Warehouse
  assignmentDate: Date
  subtotal: number
  tax: number
  total: number
  notes?: string
  items: InputAssignmentItem[]
  userId: string
  userName: string
  createdAt: Date
  updatedAt: Date
}

export interface InputAssignmentItem {
  id: string
  assignmentId: string
  productId: string
  product?: Product
  quantity: number
  unitPrice: number
  subtotal: number
  tax: number
  total: number
}

export interface FruitReception {
  id: string
  receptionNumber: string
  producerId: string
  producer?: Producer
  warehouseId: string
  warehouse?: Warehouse
  receptionDate: Date
  productId: string
  product?: Product
  boxes: number
  weightPerBox?: number
  totalWeight?: number
  shipmentStatus: "pendiente" | "embarcada" | "vendida" // Added shipment status
  shipmentId?: string // Reference to shipment when grouped
  notes?: string
  userId: string
  userName: string
  createdAt: Date
  updatedAt: Date
}

export interface Shipment {
  id: string
  shipmentNumber: string
  receptionIds: string[] // Now supports multiple receptions
  receptions?: FruitReception[] // Array of receptions
  status: ShipmentStatus
  totalBoxes: number // Total boxes from all receptions
  carrier?: string
  carrierContact?: string
  shipmentDate?: Date
  arrivalDate?: Date
  salePrice?: number // Price per box when sold
  saleTotalAmount?: number // Total sale amount
  notes?: string
  userId: string
  userName: string
  createdAt: Date
  updatedAt: Date
}

export interface ShipmentItem {
  id: string
  shipmentId: string
  receptionId: string
  reception?: FruitReception
  producerId: string
  producer?: Producer
  boxes: number
  saleAmount?: number // Calculated when shipment is sold: boxes * salePrice
}

export interface ProducerAccountMovement {
  id: string
  producerId: string
  producer?: Producer
  type: AccountMovementType
  amount: number // Positive = in favor of producer, Negative = against producer
  balance: number // Running balance after this movement
  referenceType: string // "assignment", "reception", "shipment", "payment"
  referenceId: string
  referenceNumber: string
  description: string
  date: Date
  userId: string
  userName: string
  createdAt: Date
}

export interface ProducerPayment {
  id: string
  paymentNumber: string
  producerId: string
  producer?: Producer
  paymentDate: Date
  amount: number
  paymentMethod: PaymentMethod
  reference?: string // Check number, transfer reference, etc.
  evidenceUrl?: string // Receipt or proof of payment
  notes?: string
  userId: string
  userName: string
  createdAt: Date
  updatedAt: Date
}

export type QuotationStatus = "borrador" | "enviada" | "respondida" | "ganadora" | "rechazada" | "expirada"

export interface Quotation {
  id: string
  quotationNumber: string
  requestDate: Date
  expirationDate?: Date
  status: QuotationStatus
  items: QuotationItem[]
  responses: QuotationResponse[]
  notes?: string
  userId: string
  userName: string
  createdAt: Date
  updatedAt: Date
}

export interface QuotationItem {
  id: string
  quotationId: string
  productId: string
  product?: Product
  quantity: number
  notes?: string
}

export interface QuotationResponse {
  id: string
  quotationId: string
  supplierId: string
  supplier?: Supplier
  responseDate: Date
  validUntil?: Date
  items: QuotationResponseItem[]
  subtotal: number
  tax: number
  total: number
  deliveryDays: number
  paymentTerms?: string
  notes?: string
  isWinner: boolean
  purchaseOrderId?: string // Link to generated PO
}

export interface QuotationResponseItem {
  id: string
  quotationResponseId: string
  quotationItemId: string
  productId: string
  product?: Product
  quantity: number
  unitPrice: number
  subtotal: number
  tax: number
  total: number
  availability: boolean
  notes?: string
}
