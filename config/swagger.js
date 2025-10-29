const swaggerJsdoc = require("swagger-jsdoc");
const dotenv = require("dotenv");

// Load environment variables before using them
dotenv.config();

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Nazam Core API",
      version: "1.0.0",
      description:
        "A Node.js + Express.js project with MongoDB for building robust web applications",
      contact: {
        name: "API Support",
        email: "support@nazam-core.com",
      },
      license: {
        name: "ISC",
        url: "https://opensource.org/licenses/ISC",
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === "production"
          ? 'https://api.zushh.com/'
          : `http://localhost:${process.env.PORT || 3001}`,
        description:
          process.env.NODE_ENV === "production"
            ? "Production server - Use cURL or Postman for OTP testing (Swagger UI runs from your local machine)"
            : "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          required: ["name", "email", "phoneNumber", "password"],
          properties: {
            _id: {
              type: "string",
              description: "User unique identifier",
            },
            name: {
              type: "string",
              description: "User full name",
              example: "John Doe",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
              example: "john@example.com",
            },
            phoneNumber: {
              type: "string",
              description: "User phone number (UAE format)",
              example: "+971501234567",
            },
            role: {
              type: "number",
              enum: [1],
              description: "User role: 1=user",
              example: 1,
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "User creation timestamp",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "User last update timestamp",
            },
          },
        },
        Vendor: {
          type: "object",
          required: [
            "type",
            "firstName",
            "lastName",
            "coveredCity",
            "jobService",
            "countryCode",
            "mobileNumber",
            "email",
            "password",
            "idType",
            "idNumber",
          ],
          properties: {
            _id: {
              type: "string",
              description: "Vendor unique identifier",
            },
            type: {
              type: "string",
              enum: ["corporate", "individual"],
              description: "Vendor type",
              example: "individual",
            },
            company: {
              type: "string",
              description: "Company name (only if corporate)",
              example: "ABC Company",
            },
            firstName: {
              type: "string",
              description: "First name",
              example: "John",
            },
            lastName: {
              type: "string",
              description: "Last name",
              example: "Doe",
            },
            coveredCity: {
              type: "string",
              description: "City covered by vendor",
              example: "Dubai",
            },
            jobService: {
              type: "string",
              description: "Service provided",
              example: "Plumber",
            },
            gender: {
              type: "string",
              enum: ["Male", "Female", "Other"],
              description: "Gender",
              example: "Male",
            },
            dob: {
              type: "string",
              format: "date",
              description: "Date of birth",
              example: "1990-01-01",
            },
            privilege: {
              type: "string",
              enum: ["Beginner", "Experienced", "Professional"],
              description: "Experience level",
              example: "Beginner",
            },
            profilePic: {
              type: "string",
              description: "Profile picture URL",
              example: "https://example.com/profile.jpg",
            },
            countryCode: {
              type: "string",
              description: "Country code",
              example: "+971",
            },
            mobileNumber: {
              type: "string",
              description: "Mobile number (UAE format)",
              example: "501234567",
            },
            email: {
              type: "string",
              format: "email",
              description: "Email address",
              example: "vendor@example.com",
            },
            experience: {
              type: "number",
              description: "Years of experience",
              example: 5,
            },
            bankName: {
              type: "string",
              description: "Bank name",
              example: "Emirates NBD",
            },
            branchName: {
              type: "string",
              description: "Branch name",
              example: "Dubai Mall Branch",
            },
            bankAccountNumber: {
              type: "string",
              description: "Bank account number",
              example: "1234567890",
            },
            iban: {
              type: "string",
              description: "IBAN",
              example: "AE070331234567890123456",
            },
            idType: {
              type: "string",
              enum: ["Passport", "EmiratesID", "NationalID"],
              description: "ID type",
              example: "EmiratesID",
            },
            idNumber: {
              type: "string",
              description: "ID number",
              example: "784-1234-5678901-2",
            },
            personalIdNumber: {
              type: "string",
              description: "Personal ID number",
              example: "123456789",
            },
            address: {
              type: "string",
              description: "Address",
              example: "123 Main Street, Dubai",
            },
            country: {
              type: "string",
              description: "Country",
              example: "UAE",
            },
            city: {
              type: "string",
              description: "City",
              example: "Dubai",
            },
            pinCode: {
              type: "string",
              description: "PIN code",
              example: "12345",
            },
            serviceAvailability: {
              type: "string",
              enum: ["Full-time", "Part-time"],
              description: "Service availability",
              example: "Full-time",
            },
            vatRegistration: {
              type: "boolean",
              description: "VAT registration status",
              example: false,
            },
            collectTax: {
              type: "boolean",
              description: "Tax collection status",
              example: false,
            },
            approved: {
              type: "boolean",
              description: "Admin approval status",
              example: false,
            },
            role: {
              type: "number",
              enum: [2],
              description: "Vendor role: 2=vendor",
              example: 2,
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Vendor creation timestamp",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Vendor last update timestamp",
            },
          },
        },
        Admin: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            _id: {
              type: "string",
              description: "Admin unique identifier",
            },
            name: {
              type: "string",
              description: "Admin full name",
              example: "Admin User",
            },
            email: {
              type: "string",
              format: "email",
              description: "Admin email address",
              example: "admin@example.com",
            },
            role: {
              type: "number",
              enum: [3],
              description: "Admin role: 3=admin",
              example: 3,
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Admin creation timestamp",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Admin last update timestamp",
            },
          },
        },
        UserRegisterRequest: {
          type: "object",
          required: ["name", "email", "phoneNumber", "password"],
          properties: {
            name: {
              type: "string",
              description: "User full name",
              example: "John Doe",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
              example: "john@example.com",
            },
            phoneNumber: {
              type: "string",
              description: "User phone number (UAE format)",
              example: "+971501234567",
            },
            password: {
              type: "string",
              description: "User password (minimum 6 characters)",
              example: "password123",
            },
            role: {
              type: "number",
              enum: [1],
              description: "User role (defaults to 1)",
              example: 1,
            },
          },
        },
        VendorRegisterRequest: {
          type: "object",
          required: [
            "type",
            "firstName",
            "lastName",
            "coveredCity",
            "jobService",
            "countryCode",
            "mobileNumber",
            "email",
            "password",
            "idType",
            "idNumber",
          ],
          properties: {
            type: {
              type: "string",
              enum: ["corporate", "individual"],
              description: "Vendor type",
              example: "individual",
            },
            company: {
              type: "string",
              description: "Company name (only if corporate)",
              example: "ABC Company",
            },
            firstName: {
              type: "string",
              description: "First name",
              example: "John",
            },
            lastName: {
              type: "string",
              description: "Last name",
              example: "Doe",
            },
            coveredCity: {
              type: "string",
              description: "City covered by vendor",
              example: "Dubai",
            },
            jobService: {
              type: "string",
              description: "Service provided",
              example: "Plumber",
            },
            gender: {
              type: "string",
              enum: ["Male", "Female", "Other"],
              description: "Gender",
              example: "Male",
            },
            dob: {
              type: "string",
              format: "date",
              description: "Date of birth",
              example: "1990-01-01",
            },
            privilege: {
              type: "string",
              enum: ["Beginner", "Experienced", "Professional"],
              description: "Experience level",
              example: "Beginner",
            },
            profilePic: {
              type: "string",
              description: "Profile picture URL",
              example: "https://example.com/profile.jpg",
            },
            countryCode: {
              type: "string",
              description: "Country code",
              example: "+971",
            },
            mobileNumber: {
              type: "string",
              description: "Mobile number (UAE format)",
              example: "501234567",
            },
            email: {
              type: "string",
              format: "email",
              description: "Email address",
              example: "vendor@example.com",
            },
            password: {
              type: "string",
              description: "Password (minimum 6 characters)",
              example: "password123",
            },
            experience: {
              type: "number",
              description: "Years of experience",
              example: 5,
            },
            bankName: {
              type: "string",
              description: "Bank name",
              example: "Emirates NBD",
            },
            branchName: {
              type: "string",
              description: "Branch name",
              example: "Dubai Mall Branch",
            },
            bankAccountNumber: {
              type: "string",
              description: "Bank account number",
              example: "1234567890",
            },
            iban: {
              type: "string",
              description: "IBAN",
              example: "AE070331234567890123456",
            },
            idType: {
              type: "string",
              enum: ["Passport", "EmiratesID", "NationalID"],
              description: "ID type",
              example: "EmiratesID",
            },
            idNumber: {
              type: "string",
              description: "ID number",
              example: "784-1234-5678901-2",
            },
            personalIdNumber: {
              type: "string",
              description: "Personal ID number",
              example: "123456789",
            },
            address: {
              type: "string",
              description: "Address",
              example: "123 Main Street, Dubai",
            },
            country: {
              type: "string",
              description: "Country",
              example: "UAE",
            },
            city: {
              type: "string",
              description: "City",
              example: "Dubai",
            },
            pinCode: {
              type: "string",
              description: "PIN code",
              example: "12345",
            },
            serviceAvailability: {
              type: "string",
              enum: ["Full-time", "Part-time"],
              description: "Service availability",
              example: "Full-time",
            },
            vatRegistration: {
              type: "boolean",
              description: "VAT registration status",
              example: false,
            },
            collectTax: {
              type: "boolean",
              description: "Tax collection status",
              example: false,
            },
            role: {
              type: "number",
              enum: [2],
              description: "Vendor role",
              example: 2,
            },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["password", "role"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "Email address (required for vendor/admin login)",
              example: "vendor@example.com",
            },
            phoneNumber: {
              type: "string",
              description: "Phone number (required for user login, UAE format)",
              example: "+971501234567",
            },
            password: {
              type: "string",
              description: "User password",
              example: "password123",
            },
            role: {
              type: "number",
              enum: [1, 2, 3],
              description:
                "User role: 1=user (use phoneNumber), 2=vendor (use email), 3=admin (use email)",
              example: 1,
            },
          },
        },
        UpdateDetailsRequest: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "User full name",
              example: "John Doe",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
              example: "john@example.com",
            },
            firstName: {
              type: "string",
              description: "First name (for vendors)",
              example: "John",
            },
            lastName: {
              type: "string",
              description: "Last name (for vendors)",
              example: "Doe",
            },
            coveredCity: {
              type: "string",
              description: "Covered city (for vendors)",
              example: "Dubai",
            },
            jobService: {
              type: "string",
              description: "Job service (for vendors)",
              example: "Plumber",
            },
            mobileNumber: {
              type: "string",
              description: "Mobile number (for vendors)",
              example: "1234567890",
            },
            address: {
              type: "string",
              description: "Address (for vendors)",
              example: "123 Main Street, Dubai",
            },
            city: {
              type: "string",
              description: "City (for vendors)",
              example: "Dubai",
            },
            country: {
              type: "string",
              description: "Country (for vendors)",
              example: "UAE",
            },
          },
        },
        UpdatePasswordRequest: {
          type: "object",
          required: ["currentPassword", "newPassword"],
          properties: {
            currentPassword: {
              type: "string",
              description: "Current password",
              example: "oldpassword123",
            },
            newPassword: {
              type: "string",
              description: "New password (minimum 6 characters)",
              example: "newpassword123",
            },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            exception: {
              type: "string",
              nullable: true,
              example: null,
            },
            description: {
              type: "string",
              example: "Login successful",
            },
            content: {
              type: "object",
              properties: {
                access_token: {
                  type: "string",
                  description: "JWT token",
                  example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                },
                user: {
                  type: "object",
                  properties: {
                    id: {
                      type: "string",
                      description: "User ID",
                    },
                    email: {
                      type: "string",
                      description: "User email",
                    },
                    role: {
                      type: "number",
                      description: "User role",
                    },
                    name: {
                      type: "string",
                      description: "User name (for users and admins)",
                    },
                    firstName: {
                      type: "string",
                      description: "First name (for vendors)",
                    },
                    lastName: {
                      type: "string",
                      description: "Last name (for vendors)",
                    },
                    approved: {
                      type: "boolean",
                      description: "Approval status (for vendors)",
                    },
                  },
                },
              },
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            exception: {
              type: "string",
              description: "Exception type",
              example: "VALIDATION_ERROR",
            },
            description: {
              type: "string",
              description: "Error description",
              example: "Invalid credentials",
            },
            content: {
              type: "object",
              nullable: true,
              description: "Additional error data",
            },
          },
        },
        SuccessResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            exception: {
              type: "string",
              nullable: true,
              example: null,
            },
            description: {
              type: "string",
              description: "Success message",
              example: "Operation completed successfully",
            },
            content: {
              type: "object",
              nullable: true,
              description: "Response data",
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routes/*.js", "./server.js"], // paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(options);

module.exports = specs;
