import { ApiClient, API_ENDPOINTS } from "@/lib/config/api"

export async function uploadFileToSupabase(file: File, folder: string = "payments"): Promise<string> {
  try {
    const formData = new FormData()
    formData.append("file", file)

    const response = await ApiClient.postFormData<{ url: string }>(API_ENDPOINTS.producers.uploadFile(), formData)

    return response.url
  } catch (error) {
    console.error("Error en uploadFileToSupabase:", error)
    throw error
  }
}
