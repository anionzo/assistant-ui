/** Bật module điền biểu mẫu (form filling) trong chat. */
export const FORM_MODULE_ENABLED = true;

/** Khóa trang /voice-form riêng biệt (dedicated voice form workspace).
 *  Giữ form module tích hợp trong chat, nhưng không cho truy cập trang voice-form độc lập.
 */
export const VOICE_FORM_PAGE_ENABLED = false;

/** Bật luồng form-fill (gửi text/voice qua postFill để điền form) khi mode="form-fill" trong chat.
 *  Mặc định false để chat luôn normal (gửi RAG). Code logic vẫn giữ đầy đủ để bật lại sau (set true).
 *  Tách rõ luồng normal chat và form-fill để dễ tái sử dụng mai mốt.
 */
export const FORM_FILL_VIA_CHAT_ENABLED = true;
