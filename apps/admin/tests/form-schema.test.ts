import { describe, expect, it } from "vitest";
import { extractFormDetailMeta, extractFormSchema } from "../lib/forms/schema";

describe("extractFormSchema", () => {
  it("reads gateway voice-form schema with need_to_fill", () => {
    const detail = {
      form_code: "TO_KHAI_DANG_KY_LAI_KHAI_SINH",
      form_name: "Tờ khai đăng ký lại khai sinh",
      form_schema: {
        form_name: "Tờ khai đăng ký lại khai sinh",
        need_to_fill: [
          {
            key: "ho_ten",
            label: "Họ và tên",
            field_type: "text",
            required: true,
            hint: "Ghi đầy đủ họ tên",
          },
          {
            key: "ngay_sinh",
            label: "Ngày sinh",
            field_type: "date",
          },
        ],
      },
    };

    const schema = extractFormSchema(detail, "TO_KHAI_DANG_KY_LAI_KHAI_SINH");
    expect(schema?.source).toBe("need_to_fill");
    expect(schema?.fields).toHaveLength(2);
    expect(schema?.fields[0]).toMatchObject({
      key: "ho_ten",
      label: "Họ và tên",
      type: "text",
      required: true,
      hint: "Ghi đầy đủ họ tên",
    });
    expect(schema?.title).toBe("Tờ khai đăng ký lại khai sinh");
  });

  it("reads legacy fields array format", () => {
    const detail = {
      schema: {
        title: "Legacy form",
        fields: [{ name: "email", type: "email", label: "Email", required: true }],
      },
    };

    const schema = extractFormSchema(detail);
    expect(schema?.source).toBe("fields");
    expect(schema?.fields[0]?.key).toBe("email");
    expect(schema?.fields[0]?.type).toBe("email");
  });

  it("unwraps idx-api data envelope", () => {
    const detail = {
      success: true,
      data: {
        form_code: "MAU_SO_10_DE_NGHI_HUONG_TRO_CAP_THAT_NGHIEP_1201141238",
        form_schema: {
          form_name: "Mẫu số 10",
          need_to_fill: [{ key: "ho_ten", label: "Họ tên", field_type: "text" }],
        },
      },
    };

    const meta = extractFormDetailMeta(detail);
    expect(meta.formCode).toBe("MAU_SO_10_DE_NGHI_HUONG_TRO_CAP_THAT_NGHIEP_1201141238");
    expect(extractFormSchema(detail)?.fields).toHaveLength(1);
  });
});