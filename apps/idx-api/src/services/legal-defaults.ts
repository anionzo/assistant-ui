import type { LegalConfigValue, LegalDocumentValue, LegalHomeValue, LegalLocaleBundle } from "../db/config-types";

type SectionSeed = { title: string; body: string };

function docFromSections(
  title: string,
  updatedLabel: string,
  intro: string,
  sections: SectionSeed[],
): LegalDocumentValue {
  return {
    useCustom: false,
    title,
    updatedLabel,
    intro,
    sections: sections.map((section, index) => ({
      id: `s${index + 1}`,
      title: section.title,
      body: section.body,
    })),
  };
}

const VI_PRIVACY_SECTIONS: SectionSeed[] = [
  { title: "1. Phạm vi", body: "Áp dụng cho người dùng truy cập website/ứng dụng, bao gồm các tính năng như trò chuyện, biểu mẫu, đăng ký và đăng nhập (email/mật khẩu hoặc nhà cung cấp bên thứ ba như Google, nếu được bật)." },
  { title: "2. Thông tin có thể thu thập", body: "Tùy cách bạn sử dụng, chúng tôi có thể xử lý:\n• Thông tin tài khoản (ví dụ: email, tên hiển thị, ảnh đại diện).\n• Nội dung bạn gửi qua ứng dụng (tin nhắn, dữ liệu biểu mẫu, tệp đính kèm nếu có).\n• Dữ liệu kỹ thuật (cookie phiên, nhật ký, địa chỉ IP, v.v.) phục vụ vận hành và bảo mật cơ bản.\n• Dữ liệu từ đăng nhập bên thứ ba trong phạm vi bạn cho phép." },
  { title: "3. Mục đích sử dụng", body: "Thông tin có thể được dùng để:\n• Vận hành, duy trì và cải thiện dịch vụ.\n• Xác thực phiên/tài khoản và hạn chế lạm dụng.\n• Lưu trữ dữ liệu theo tài khoản (nếu tính năng được bật).\n• Đáp ứng yêu cầu pháp lý áp dụng (nếu có)." },
  { title: "4. Đăng nhập bên thứ ba", body: "Nếu bạn dùng đăng nhập qua bên thứ ba (ví dụ Google), việc xác thực do bên đó thực hiện. Chúng tôi không lưu mật khẩu của nhà cung cấp đó. Bạn có thể thu hồi quyền trong cài đặt tài khoản tương ứng." },
  { title: "5. Lưu trữ", body: "Dữ liệu có thể được lưu trên hạ tầng do đơn vị vận hành/triển khai quản lý. Thời gian lưu trữ và biện pháp bảo vệ có thể khác nhau giữa các môi trường. Chúng tôi không cam kết mức độ bảo mật tuyệt đối." },
  { title: "6. Quyền của người dùng", body: "Trong phạm vi hệ thống hỗ trợ, bạn có thể:\n• Cập nhật một số thông tin hồ sơ hoặc mật khẩu (nếu có).\n• Yêu cầu xóa tài khoản qua chức năng được cung cấp (nếu có).\n• Liên hệ quản trị viên của đợt triển khai bạn đang sử dụng." },
  { title: "7. Liên hệ", body: "Thắc mắc về quyền riêng tư: vui lòng liên hệ quản trị viên hoặc đơn vị triển khai dịch vụ phiên bản bạn đang truy cập." },
];

const VI_TERMS_SECTIONS: SectionSeed[] = [
  { title: "1. Dịch vụ", body: "Ứng dụng cung cấp các tính năng trợ lý AI và công cụ tương tác liên quan, tùy cấu hình từng lần triển khai. Nội dung do AI tạo ra chỉ mang tính tham khảo; người dùng tự chịu trách nhiệm kiểm tra trước khi sử dụng cho bất kỳ mục đích nào." },
  { title: "2. Tài khoản", body: "Nếu sử dụng tài khoản, bạn chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động phát sinh từ tài khoản đó, trong phạm vi cho phép của pháp luật." },
  { title: "3. Hành vi bị hạn chế", body: "Bạn không nên:\n• Sử dụng dịch vụ trái quy định pháp luật hiện hành.\n• Gây gián đoạn, can thiệp trái phép hoặc lạm dụng hệ thống.\n• Khai thác dịch vụ cho mục đích gây hại hoặc spam." },
  { title: "4. Nội dung", body: "Quyền sở hữu trí tuệ đối với giao diện, thương hiệu và tài liệu liên quan thuộc về các chủ thể tương ứng. Bạn chịu trách nhiệm về nội dung do mình gửi; đồng thời cho phép chúng tôi xử lý nội dung đó trong phạm vi cần thiết để vận hành dịch vụ." },
  { title: "5. Miễn trừ trách nhiệm", body: "Dịch vụ được cung cấp \"nguyên trạng\" và \"theo khả dụng\". Chúng tôi không bảo đảm tính chính xác, đầy đủ, liên tục hoặc phù hợp với mọi mục đích cụ thể. Mọi quyết định dựa trên kết quả từ ứng dụng là do người dùng tự chịu trách nhiệm." },
  { title: "6. Thay đổi", body: "Chúng tôi có thể sửa đổi dịch vụ hoặc điều khoản bất cứ lúc nào. Phiên bản cập nhật có hiệu lực khi đăng tại trang này. Việc tiếp tục sử dụng có thể được hiểu là chấp nhận thay đổi." },
  { title: "7. Liên hệ", body: "Câu hỏi về điều khoản: liên hệ quản trị viên hoặc đơn vị triển khai phiên bản dịch vụ bạn đang sử dụng." },
];

const EN_PRIVACY_SECTIONS: SectionSeed[] = [
  { title: "1. Scope", body: "Applies to users of the website/application, including features such as chat, forms, registration, and sign-in (email/password or third-party providers such as Google, when enabled)." },
  { title: "2. Information that may be collected", body: "Depending on how you use the service, we may process:\n• Account information (e.g. email, display name, profile photo).\n• Content you submit (messages, form data, attachments if any).\n• Technical data (session cookies, logs, IP address, etc.) for basic operations and security.\n• Third-party sign-in data within the scope you authorize." },
  { title: "3. Purposes of use", body: "Information may be used to:\n• Operate, maintain, and improve the service.\n• Authenticate sessions/accounts and limit abuse.\n• Store data per account (when that feature is enabled).\n• Meet applicable legal requirements (if any)." },
  { title: "4. Third-party sign-in", body: "If you use third-party sign-in (e.g. Google), authentication is handled by that provider. We do not store that provider's password. You may revoke access in the provider's account settings." },
  { title: "5. Storage", body: "Data may be stored on infrastructure managed by the operator/deployer. Retention periods and safeguards may vary by environment. We do not guarantee absolute security." },
  { title: "6. User rights", body: "Where supported by the system, you may:\n• Update certain profile fields or passwords (if available).\n• Request account deletion through provided features (if available).\n• Contact the administrators of the deployment you are using." },
  { title: "7. Contact", body: "Privacy questions: contact the administrator or deployer of the service instance you are accessing." },
];

const EN_TERMS_SECTIONS: SectionSeed[] = [
  { title: "1. The service", body: "The application provides AI assistant and related interactive features, depending on each deployment's configuration. AI-generated content is for reference only; users are responsible for verifying outcomes before relying on them for any purpose." },
  { title: "2. Accounts", body: "If you use an account, you are responsible for safeguarding credentials and for activities under that account, to the extent permitted by law." },
  { title: "3. Restricted conduct", body: "You should not:\n• Use the service in violation of applicable law.\n• Disrupt, interfere with, or abuse the system.\n• Exploit the service for harmful or spam purposes." },
  { title: "4. Content", body: "Intellectual property in the interface, branding, and related materials belongs to the respective rights holders. You are responsible for content you submit and grant us permission to process it as needed to operate the service." },
  { title: "5. Disclaimer", body: "The service is provided \"as is\" and \"as available\". We make no warranties regarding accuracy, completeness, availability, or fitness for any particular purpose. Decisions based on app output are solely the user's responsibility." },
  { title: "6. Changes", body: "We may modify the service or these terms at any time. Updates take effect when posted on this page. Continued use may constitute acceptance of changes." },
  { title: "7. Contact", body: "Questions about these terms: contact the administrator or deployer of the service instance you are using." },
];

function localeBundle(locale: "vi" | "en"): LegalLocaleBundle {
  if (locale === "en") {
    return {
      privacy: docFromSections(
        "Privacy Policy",
        "Last updated: July 3, 2026",
        "This document describes, in general terms, how the service (\"the app\", \"we\") may collect and process information when you use it. Actual practices may differ by deployer and configuration.",
        EN_PRIVACY_SECTIONS,
      ),
      terms: docFromSections(
        "Terms of Service",
        "Last updated: July 3, 2026",
        "By accessing or using the service, you are deemed to have read and accepted these terms. If you do not agree, please stop using the service.",
        EN_TERMS_SECTIONS,
      ),
      home: {
        useCustom: false,
        eyebrow: "AI assistant platform",
        description:
          "An application for AI-assisted chat, data entry, and other interactive features depending on deployment configuration. Sign in to sync data across sessions when that feature is enabled.",
        features: [
          { title: "Chat", body: "Interact with an AI assistant in a configured context. Results may vary and are provided for reference only." },
          { title: "Interactive input", body: "Supports entering information through the UI and/or voice, depending on the version and configuration in use." },
          { title: "Policies & terms", body: "Please read the Privacy Policy and Terms of Service before continuing. Content may be updated per deployment." },
        ],
      },
    };
  }

  return {
    privacy: docFromSections(
      "Chính sách bảo mật",
      "Cập nhật lần cuối: 3 tháng 7, 2026",
      "Tài liệu này mô tả, ở mức tổng quát, cách dịch vụ (\"ứng dụng\", \"chúng tôi\") có thể thu thập và xử lý thông tin khi bạn sử dụng. Chi tiết thực tế có thể khác tùy đơn vị triển khai và cấu hình từng phiên bản.",
      VI_PRIVACY_SECTIONS,
    ),
    terms: docFromSections(
      "Điều khoản sử dụng",
      "Cập nhật lần cuối: 3 tháng 7, 2026",
      "Bằng việc truy cập hoặc sử dụng dịch vụ, bạn được xem là đã đọc và chấp nhận các điều khoản dưới đây. Nếu không đồng ý, vui lòng ngừng sử dụng.",
      VI_TERMS_SECTIONS,
    ),
    home: {
      useCustom: false,
      eyebrow: "Nền tảng trợ lý AI",
      description:
        "Ứng dụng hỗ trợ trò chuyện với trợ lý AI, nhập liệu và một số tính năng tương tác khác tùy cấu hình triển khai. Đăng nhập để đồng bộ dữ liệu giữa các phiên (nếu được bật).",
      features: [
        { title: "Trò chuyện", body: "Trao đổi với trợ lý AI theo ngữ cảnh được cấu hình. Kết quả có thể thay đổi và chỉ mang tính tham khảo." },
        { title: "Nhập liệu tương tác", body: "Hỗ trợ nhập thông tin qua giao diện và/hoặc giọng nói, tùy phiên bản và cấu hình đang sử dụng." },
        { title: "Chính sách & điều khoản", body: "Vui lòng đọc Chính sách bảo mật và Điều khoản sử dụng trước khi tiếp tục. Nội dung có thể được cập nhật theo từng đợt triển khai." },
      ],
    },
  };
}

export function buildDefaultLegalConfig(): LegalConfigValue {
  return {
    locales: {
      vi: localeBundle("vi"),
      en: localeBundle("en"),
    },
    display: {
      footerOnPublicPages: true,
      footerOnAuthPages: true,
      showHomeFeatures: true,
      showHomeCtaRegister: true,
    },
  };
}

export function fallbackLocaleBundle(locale: "vi" | "en"): LegalLocaleBundle {
  return localeBundle(locale);
}

export function fallbackDocument(
  locale: "vi" | "en",
  document: "privacy" | "terms",
): LegalDocumentValue {
  return localeBundle(locale)[document];
}

export function fallbackHome(locale: "vi" | "en"): LegalHomeValue {
  return localeBundle(locale).home;
}