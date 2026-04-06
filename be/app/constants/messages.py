class ErrorMessage:
    # Auth
    INVALID_CREDENTIALS = "Email hoặc mật khẩu không đúng"
    EMAIL_ALREADY_EXISTS = "Email đã được sử dụng"
    USER_NOT_FOUND = "Không tìm thấy người dùng"
    INACTIVE_USER = "Tài khoản chưa được kích hoạt"
    BANNED_USER = "Tài khoản đã bị khóa"
    TOKEN_EXPIRED = "Token đã hết hạn"
    TOKEN_INVALID = "Token không hợp lệ"
    UNAUTHORIZED = "Bạn không có quyền truy cập"
    FORBIDDEN = "Bạn không có quyền thực hiện hành động này"

    # General
    NOT_FOUND = "Không tìm thấy dữ liệu"
    INTERNAL_ERROR = "Lỗi hệ thống, vui lòng thử lại sau"
    VALIDATION_ERROR = "Dữ liệu không hợp lệ"


class SuccessMessage:
    REGISTER_SUCCESS = "Đăng ký thành công"
    LOGIN_SUCCESS = "Đăng nhập thành công"
    LOGOUT_SUCCESS = "Đăng xuất thành công"
    PASSWORD_CHANGED = "Đổi mật khẩu thành công"
    PROFILE_UPDATED = "Cập nhật thông tin thành công"
