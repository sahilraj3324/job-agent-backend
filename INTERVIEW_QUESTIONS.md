# Job Agent Project - 100 Interview Questions with Answers

---

## **NestJS Framework (15 Questions)**

### 1. What is NestJS and why did you choose it for this project?
NestJS is a progressive Node.js framework for building efficient, scalable server-side applications. It uses TypeScript by default and follows Angular-inspired architecture. I chose it because:
- Strong TypeScript support with decorators
- Built-in dependency injection
- Modular architecture for scalability
- Excellent integration with MongoDB, Passport, Swagger
- Great developer experience with CLI tools

### 2. Explain the module-controller-service architecture in NestJS.
- **Modules**: Organize related functionality (e.g., `UsersModule` groups user-related code)
- **Controllers**: Handle HTTP requests and define routes (e.g., `@Controller('users')`)
- **Services**: Contain business logic, injected into controllers (e.g., `UsersService` handles DB operations)

```typescript
// Module bundles everything
@Module({
    controllers: [UsersController],
    providers: [UsersService],
})
export class UsersModule {}
```

### 3. What is the purpose of `@Module()` decorator and its properties?
```typescript
@Module({
    imports: [],      // Other modules this module depends on
    controllers: [],  // Controllers that handle routes
    providers: [],    // Services, guards, interceptors to inject
    exports: [],      // What this module exposes to other modules
})
```

### 4. How does dependency injection work in NestJS?
NestJS uses a DI container that automatically injects dependencies:
```typescript
@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
        private jwtService: JwtService, // Auto-injected
    ) {}
}
```
The framework creates and manages singleton instances automatically.

### 5. What is `forwardRef()` and when would you use it?
`forwardRef()` resolves circular dependencies between modules:
```typescript
// UsersModule needs AuthModule, AuthModule needs UsersModule
@Module({
    imports: [forwardRef(() => AuthModule)],
})
export class UsersModule {}
```
It delays the resolution until both modules are loaded.

### 6. Explain the difference between `@Injectable()` and `@Controller()`.
- `@Injectable()`: Marks a class as a provider that can be injected (services, guards, strategies)
- `@Controller()`: Marks a class as a route handler that receives HTTP requests

```typescript
@Injectable()
export class UsersService {} // Business logic

@Controller('users')
export class UsersController {} // HTTP routing
```

### 7. How do you handle circular dependencies in NestJS?
1. Use `forwardRef()` in both module imports
2. Use `@Inject(forwardRef(() => ServiceName))` in constructors
3. Restructure code to avoid circular dependencies (preferred)

### 8. What are guards in NestJS and how do they differ from middleware?
- **Guards**: Determine if a request should proceed (authorization), have access to ExecutionContext
- **Middleware**: Run before route handlers, process requests (like Express middleware)

```typescript
@UseGuards(JwtAuthGuard)
@Get('me')
getCurrentUser() {} // Only runs if guard returns true
```

### 9. Explain the request lifecycle in NestJS.
1. Incoming request → Middleware
2. Guards (authorization check)
3. Interceptors (pre-controller)
4. Pipes (validation/transformation)
5. Controller handler
6. Interceptors (post-controller)
7. Exception filters (if error)
8. Response sent

### 10. What is `@Inject()` decorator used for?
Explicitly specifies what to inject when automatic injection isn't possible:
```typescript
constructor(
    @Inject('CONFIG') private config: AppConfig,
    @Inject(forwardRef(() => JwtService)) private jwtService: JwtService,
) {}
```

### 11. How do you implement global modules in NestJS?
```typescript
@Global()
@Module({
    providers: [ConfigService],
    exports: [ConfigService],
})
export class ConfigModule {}
```
Global modules are available everywhere without importing.

### 12. What is `@InjectModel()` and how does it work with Mongoose?
Injects a Mongoose model into a service:
```typescript
constructor(
    @InjectModel(User.name) private userModel: Model<User>,
) {}
// Now you can use: this.userModel.find(), .create(), etc.
```

### 13. How do you implement exception filters in NestJS?
```typescript
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
        const response = host.switchToHttp().getResponse();
        response.status(exception.getStatus()).json({
            message: exception.message,
        });
    }
}
```

### 14. Explain the purpose of `passthrough: true` in `@Res()`.
Allows both manual response handling AND returning values:
```typescript
@Post('login')
async login(@Res({ passthrough: true }) res: Response) {
    res.cookie('token', jwt); // Set cookie
    return { user }; // Return JSON (wouldn't work without passthrough)
}
```

### 15. What is the difference between `@Body()`, `@Param()`, and `@Query()`?
```typescript
@Get(':id')
getUser(
    @Param('id') id: string,      // /users/123 → id = "123"
    @Query('filter') filter: string, // /users/123?filter=active → filter = "active"
)

@Post()
create(@Body() dto: CreateUserDto) // Request body JSON
```

---

## **MongoDB & Mongoose (12 Questions)**

### 16. What is Mongoose and why use it with MongoDB?
Mongoose is an ODM (Object Document Mapper) that provides:
- Schema validation
- Type casting
- Query building
- Middleware hooks
- Business logic encapsulation

### 17. Explain Schema, Model, and Document.
- **Schema**: Blueprint defining document structure and validation
- **Model**: A constructor compiled from schema, represents a collection
- **Document**: An instance of a model, represents a single record

```typescript
const UserSchema = new Schema({...}); // Schema
const User = mongoose.model('User', UserSchema); // Model
const user = new User({...}); // Document
```

### 18. What does `@Prop({ select: false })` do?
Excludes the field from query results by default:
```typescript
@Prop({ select: false })
password: string;

// To include it:
this.userModel.findOne().select('+password');
```

### 19. How does `{ unique: true, sparse: true }` work?
- `unique: true`: No duplicate values allowed
- `sparse: true`: Allows multiple null/undefined values (only indexes non-null)

```typescript
@Prop({ unique: true, sparse: true })
googleId: string; // Users without Google can have null
```

### 20. Explain the aggregation pipeline in `getCompanies()`.
```typescript
const companies = await this.companyModel.aggregate([
    { $lookup: {...} },  // Join with jobs collection
    { $project: {...} }, // Select/compute fields
    { $sort: {...} },    // Order results
]);
```
Aggregation processes documents through multiple stages.

### 21. What is `{ timestamps: true }`?
Automatically adds and manages `createdAt` and `updatedAt` fields:
```typescript
@Schema({ timestamps: true })
export class User {
    createdAt: Date; // Auto-set on create
    updatedAt: Date; // Auto-updated on save
}
```

### 22. How do you implement population in Mongoose?
```typescript
// Schema with reference
@Prop({ type: Types.ObjectId, ref: 'Company' })
company: Company;

// Query with population
this.jobModel.find().populate('company');
```

### 23. What is `$lookup` aggregation?
Performs a left outer join with another collection:
```typescript
{
    $lookup: {
        from: 'jobs',        // Collection to join
        localField: 'name',  // Field in current collection
        foreignField: 'companyName', // Field in target
        as: 'jobs'           // Output array field
    }
}
```

### 24. Difference between `findByIdAndUpdate()` and `updateOne()`.
- `findByIdAndUpdate()`: Returns the updated document
- `updateOne()`: Returns only operation result (matched/modified count)

```typescript
const user = await this.userModel.findByIdAndUpdate(id, data, { new: true });
// { new: true } returns updated document
```

### 25. Embedded documents vs references?
- **Embedded**: Store related data inside document (faster reads, data duplication)
- **References**: Store ObjectId, populate when needed (normalized, slower reads)

```typescript
// Embedded
projects: [{ name: string, url: string }]

// Referenced
@Prop({ type: Types.ObjectId, ref: 'Project' })
projects: Project[]
```

### 26. Purpose of indexes and implementation?
Indexes speed up queries on specific fields:
```typescript
@Prop({ unique: true, index: true })
email: string;

// Compound index
UserSchema.index({ email: 1, createdAt: -1 });
```

### 27. How does `exec()` differ from awaiting directly?
`exec()` returns a proper Promise with stack traces:
```typescript
// Both work, but exec() is recommended
const users = await this.userModel.find().exec();
const users = await this.userModel.find();
```

---

## **Authentication & Security (15 Questions)**

### 28. Explain your JWT authentication flow.
1. User logs in with credentials
2. Server validates and generates JWT with user ID
3. JWT stored in HTTP-only cookie
4. Subsequent requests include cookie automatically
5. JwtStrategy validates token and attaches user to request

### 29. What are HTTP-only cookies?
Cookies that JavaScript cannot access (`document.cookie`):
```typescript
res.cookie('access_token', token, {
    httpOnly: true,  // Can't be read by JS
    secure: true,    // HTTPS only
    sameSite: 'lax', // CSRF protection
});
```
Prevents XSS attacks from stealing tokens.

### 30. How does Passport.js work with NestJS?
Passport provides authentication strategies. NestJS wraps them:
```typescript
// Strategy validates credentials
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    validate(payload) { return user; } // Attaches to req.user
}

// Guard uses strategy
@UseGuards(AuthGuard('jwt'))
```

### 31. Difference between JwtStrategy and GoogleStrategy?
- **JwtStrategy**: Validates JWT tokens for authenticated requests
- **GoogleStrategy**: Handles OAuth flow with Google, exchanges code for user profile

### 32. Purpose of `ExtractJwt.fromExtractors()`.
Allows multiple token extraction methods:
```typescript
ExtractJwt.fromExtractors([
    (req) => req?.cookies?.access_token, // Try cookie first
    ExtractJwt.fromAuthHeaderAsBearerToken(), // Fallback to header
])
```

### 33. How do you handle OAuth token exchange?
1. User redirected to Google OAuth
2. Google redirects back with authorization code
3. Passport exchanges code for access token
4. Access token used to fetch user profile
5. `findOrCreateByGoogle()` creates/links user

### 34. Why is password hashing important?
If database is breached, hashed passwords can't be reversed:
```typescript
const hash = await bcrypt.hash(password, 10);
// Stored: $2b$10$N9qo8uLOickgx2ZMRZoMy...
```

### 35. What is bcrypt and salt rounds?
bcrypt is a password hashing algorithm. Salt rounds determine computational cost:
```typescript
bcrypt.hash(password, 10); // 2^10 iterations
// Higher = more secure but slower
```

### 36. Explain `findOrCreateByGoogle()` logic.
```typescript
async findOrCreateByGoogle(googleUser) {
    // 1. Check by googleId (returning user)
    let user = await this.userModel.findOne({ googleId });
    if (user) return user;
    
    // 2. Check by email (link accounts)
    user = await this.userModel.findOne({ email });
    if (user) {
        user.googleId = googleId; // Link Google to existing
        return user.save();
    }
    
    // 3. Create new user
    return this.userModel.create(googleUser);
}
```

### 37. Security headers for production?
```typescript
app.use(helmet()); // Adds headers:
// X-Content-Type-Options: nosniff
// X-Frame-Options: DENY
// Strict-Transport-Security
// Content-Security-Policy
```

### 38. How would you implement refresh tokens?
1. Issue short-lived access token (15min) + long-lived refresh token (7d)
2. Store refresh token hash in database
3. When access token expires, client sends refresh token
4. Validate refresh token, issue new access token
5. Rotate refresh tokens for security

### 39. What is CSRF and how do cookies help?
CSRF tricks users into making unwanted requests. Prevention:
- `sameSite: 'lax'` or `'strict'` prevents cross-site cookie sending
- CSRF tokens for state-changing operations

### 40. `sameSite` cookie attribute options.
- `strict`: Cookie only sent on same-site requests
- `lax`: Sent on top-level navigation (links) but not AJAX from other sites
- `none`: Always sent (requires `secure: true`)

### 41. Protecting against brute force?
- Rate limiting: `@nestjs/throttler`
- Account lockout after failed attempts
- CAPTCHA after threshold
- Exponential backoff

### 42. Authentication vs Authorization?
- **Authentication**: Verifying who you are (login)
- **Authorization**: Verifying what you can access (permissions/roles)

---

## **OpenAI & Embeddings (12 Questions)**

### 43. What are embeddings?
Vector representations of text that capture semantic meaning:
```typescript
// "Software Engineer" → [0.12, -0.45, 0.89, ...]
// Similar texts have similar vectors
const embedding = await openai.createEmbedding(text);
```

### 44. Explain cosine similarity.
Measures angle between two vectors (0 to 1 for normalized vectors):
```typescript
function cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
    return dotProduct / (magnitudeA * magnitudeB);
}
```
1.0 = identical, 0 = unrelated, -1 = opposite

### 45. Why `text-embedding-3-small`?
- Cost-effective for high-volume embeddings
- Good quality for job/resume matching
- 1536 dimensions (smaller than ada-002)
- Faster processing

### 46. Converting embeddings to percentages.
```typescript
scoreToPercentage(score: number): number {
    // Cosine similarity: -1 to 1
    // Convert to 0-100
    return Math.round(((score + 1) / 2) * 100);
}
// 0.8 → 90%, 0.5 → 75%, 0 → 50%
```

### 47. Purpose of JDParserService.
Extracts structured data from raw job descriptions using LLM:
```typescript
// Input: "We need a Senior React Developer with 5+ years..."
// Output: { role: "Senior React Developer", skills: ["React"], minExperience: 5 }
```

### 48. Prompt engineering in ResumeAnalyzerService.
Crafting prompts to get structured, useful responses:
```typescript
const prompt = `Analyze this resume and provide:
1. Top 3 strengths
2. Areas for improvement
3. Suggested keywords
Format as JSON with keys: strengths, improvements, keywords`;
```

### 49. Structured output with OpenAI.
Using `response_format: { type: "json_object" }`:
```typescript
const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }]
});
const parsed = JSON.parse(response.choices[0].message.content);
```

### 50. Handling OpenAI rate limiting.
```typescript
// Retry with exponential backoff
async function callWithRetry(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (error.status === 429) {
                await sleep(Math.pow(2, i) * 1000);
            }
        }
    }
}
```

### 51. Chat completions vs embeddings API.
- **Chat completions**: Generate text responses, conversations
- **Embeddings**: Convert text to vectors for similarity search

### 52. Implementing embedding caching.
```typescript
// Store embeddings with job/candidate
@Prop({ type: [Number] })
embedding: number[];

// Skip regeneration if embedding exists
if (!job.embedding) {
    job.embedding = await this.embeddingService.embed(job.rawJD);
}
```

### 53. Matching algorithm in MatchingService.
```typescript
matchJobToCandidates(jobEmbedding, candidates) {
    return candidates
        .map(c => ({
            candidateId: c.id,
            score: cosineSimilarity(jobEmbedding, c.embedding)
        }))
        .sort((a, b) => b.score - a.score) // Highest first
        .map((r, i) => ({ ...r, rank: i + 1 }));
}
```

### 54. What is topK?
Limits results to top K matches:
```typescript
getMatchingJobs(candidateId, topK = 10) {
    // Returns only the 10 best matches
    return results.slice(0, topK);
}
```

---

## **RESTful API Design (10 Questions)**

### 55. What makes an API RESTful?
- Stateless: No session state on server
- Resource-based URLs: `/users`, `/jobs`
- HTTP methods: GET (read), POST (create), PUT (update), DELETE
- Standard status codes: 200, 201, 400, 404, 500

### 56. Endpoint naming conventions.
```
GET /users           # List all
GET /users/:id       # Get one
POST /users          # Create
PUT /users/:id       # Update
DELETE /users/:id    # Delete

# Nested resources
GET /users/:id/jobs  # User's jobs
```

### 57. PUT vs PATCH.
- **PUT**: Replace entire resource
- **PATCH**: Partial update

```typescript
@Put(':id')    // Send complete user object
@Patch(':id')  // Send only changed fields
```

### 58. Implementing pagination.
```typescript
@Get()
async getJobs(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
) {
    return this.jobModel
        .find()
        .skip((page - 1) * limit)
        .limit(limit);
}
```

### 59. HTTP status codes used.
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized
- `404`: Not Found
- `409`: Conflict (duplicate email)
- `500`: Server Error

### 60. API versioning.
```typescript
// URL versioning
@Controller('v1/users')
// or
app.setGlobalPrefix('api/v1');
```

### 61. CORS configuration.
```typescript
app.enableCors({
    origin: ['http://localhost:3000', 'https://myapp.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true, // Allow cookies
});
```

### 62. Query vs path parameters.
- **Path**: Identifies resource (`/users/123`)
- **Query**: Filters/options (`/users?role=admin&page=2`)

### 63. File uploads in NestJS.
```typescript
@Post('upload-pdf')
@UseInterceptors(FileInterceptor('file'))
async upload(@UploadedFile() file: Express.Multer.File) {
    const buffer = file.buffer;
    const mimetype = file.mimetype;
}
```

### 64. Content negotiation.
Client specifies desired format:
```
Accept: application/json
Content-Type: application/json
```

---

## **Swagger/OpenAPI (8 Questions)**

### 65. What is Swagger?
Interactive API documentation that:
- Lists all endpoints
- Shows request/response schemas
- Allows testing directly in browser
- Generates client SDKs

### 66. Swagger decorators explained.
```typescript
@ApiTags('Users')           // Groups endpoints
@ApiOperation({ summary: 'Login' })  // Endpoint description
@ApiResponse({ status: 200 })        // Possible responses
@ApiBody({ type: LoginDto })         // Request body schema
```

### 67. Documenting request bodies.
```typescript
class CreateUserDto {
    @ApiProperty({ example: 'john@example.com' })
    email: string;
    
    @ApiProperty({ required: false })
    phone?: string;
}

@ApiBody({ type: CreateUserDto })
@Post()
create(@Body() dto: CreateUserDto) {}
```

### 68. `@ApiConsumes()` usage.
Specifies content types the endpoint accepts:
```typescript
@ApiConsumes('multipart/form-data')
@Post('upload')
uploadFile() {}
```

### 69. Authentication in Swagger UI.
```typescript
// In main.ts
const config = new DocumentBuilder()
    .addBearerAuth()
    .addCookieAuth('access_token')
    .build();

// In controller
@ApiBearerAuth()
@Get('protected')
```

### 70. `addBearerAuth()` vs `addCookieAuth()`.
- `addBearerAuth()`: Token in `Authorization: Bearer <token>` header
- `addCookieAuth()`: Token in HTTP cookie

### 71. Optional query parameters.
```typescript
@ApiQuery({ name: 'role', required: false })
@Get()
getUsers(@Query('role') role?: string) {}
```

### 72. Swagger for frontend development.
- Auto-generates TypeScript types
- Mock server from spec
- Contract-first development
- API change tracking

---

## **TypeScript (10 Questions)**

### 73. Interface vs class.
- **Interface**: Type-only, erased at runtime
- **Class**: Has runtime representation, can be instantiated

```typescript
interface User { name: string; } // Type only
class User { name: string; }     // Creates constructor
```

### 74. Why convert DTOs to classes?
NestJS decorators need runtime metadata. Interfaces are erased:
```typescript
// This works with class
@ApiBody({ type: CreateUserDto })
// Interfaces have no runtime representation
```

### 75. `select: false` meaning.
In Mongoose schema, NOT TypeScript:
```typescript
@Prop({ select: false })
password: string;
// Default queries exclude password
```

### 76. `Omit<T, K>` utility type.
Creates type excluding specified keys:
```typescript
type UserResponse = Omit<User, 'password'>;
// UserResponse has all User fields except password
```

### 77. `import type` usage.
Imports only the type, erased at runtime:
```typescript
import type { Response } from 'express';
// Prevents "isolatedModules" error with decorators
```

### 78. Union types handling.
```typescript
function getId(user: User | UserResponse): string {
    // Type guard
    if ('_id' in user) {
        return user._id.toString();
    }
    return user.id;
}
```

### 79. `as const` assertion.
Creates literal types instead of widened types:
```typescript
const options = { httpOnly: true } as const;
// Type: { readonly httpOnly: true }
// Without: { httpOnly: boolean }
```

### 80. Type guards.
Runtime checks that narrow types:
```typescript
function isUser(obj: unknown): obj is User {
    return typeof obj === 'object' && 'email' in obj;
}

if (isUser(data)) {
    console.log(data.email); // TypeScript knows it's User
}
```

### 81. Mapped types.
Transform existing types:
```typescript
type Partial<T> = { [K in keyof T]?: T[K] };
type UpdateUserDto = Partial<User>; // All fields optional
```

### 82. How decorators work.
Functions that modify classes/methods at definition time:
```typescript
function Log(target, key, descriptor) {
    const original = descriptor.value;
    descriptor.value = function(...args) {
        console.log(`Calling ${key}`);
        return original.apply(this, args);
    };
}
```

---

## **Project Architecture (10 Questions)**

### 83. Folder structure explained.
```
src/
├── agents/       # AI-related services (parsing, matching)
├── auth/         # Authentication (JWT, OAuth)
├── candidates/   # Candidate management
├── companies/    # Company data
├── discovery/    # Job scraping/ingestion
├── jobs/         # Job postings
├── match/        # Matching algorithms
├── openai/       # OpenAI API wrapper
├── saved-jobs/   # User's saved jobs
├── users/        # User management
└── main.ts       # Application entry
```

### 84. Why separate agents folder?
Groups AI/ML-related services:
- Clear separation from CRUD operations
- Reusable across modules
- Easy to swap AI providers

### 85. Separation of concerns.
- **Controllers**: HTTP handling only
- **Services**: Business logic
- **Schemas**: Data structure
- **Guards**: Authorization
Each component has single responsibility.

### 86. Barrel pattern (index.ts).
Consolidates exports for cleaner imports:
```typescript
// users/index.ts
export * from './users.module';
export * from './users.service';

// Importing
import { UsersModule, UsersService } from './users';
```

### 87. Scaling the application.
- Horizontal: Multiple instances behind load balancer
- Caching: Redis for embeddings/sessions
- Queue: Bull for async job processing
- Microservices: Split into separate deployable services

### 88. Discovery module purpose.
Automates job collection:
- Scrapes career pages
- Discovers companies from YC
- Uses LLM to extract job data
- Scheduled cleanup of old jobs

### 89. Scheduler for job cleanup.
```typescript
@Cron('0 0 * * *') // Daily at midnight
async cleanupOldJobs() {
    await this.jobModel.deleteMany({
        createdAt: { $lt: sevenDaysAgo }
    });
}
```

### 90. Seed companies purpose.
Provides initial data for discovery:
```typescript
const seedCompanies = [
    { name: 'Stripe', careerPageUrl: 'https://stripe.com/jobs' },
    // ...
];
```

### 91. Environment configuration.
```typescript
// .env
JWT_SECRET=...
MONGODB_URI=...

// Access
process.env.JWT_SECRET

// Better: @nestjs/config
constructor(private config: ConfigService) {
    this.config.get('JWT_SECRET');
}
```

### 92. Testing strategies.
- **Unit tests**: Jest for services
- **Integration tests**: Test module interactions
- **E2E tests**: Supertest for HTTP endpoints
- **Database**: In-memory MongoDB for tests

---

## **General Software Engineering (8 Questions)**

### 93. Error handling in async operations.
```typescript
try {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');
} catch (error) {
    if (error instanceof HttpException) throw error;
    throw new InternalServerErrorException('Database error');
}
```

### 94. `Error` vs `BadRequestException`.
- **Error**: Generic JavaScript error
- **BadRequestException**: NestJS exception with 400 status code, proper JSON response

```typescript
throw new BadRequestException('Invalid input');
// Returns: { statusCode: 400, message: 'Invalid input' }
```

### 95. Logging in production.
```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class UsersService {
    private logger = new Logger(UsersService.name);
    
    async create() {
        this.logger.log('Creating user');
        this.logger.error('Failed', error.stack);
    }
}
```

### 96. Purpose of DTOs.
Data Transfer Objects:
- Define request/response shapes
- Enable validation with class-validator
- Document API contracts
- Decouple internal models from API

### 97. Ensuring code reusability.
- Extract common logic to shared services
- Use base classes for similar entities
- Create utility functions (`common/utils`)
- Design modular, exportable modules

### 98. Single Responsibility Principle.
Each class has one reason to change:
- `UsersController`: Only HTTP routing
- `UsersService`: Only user business logic
- `JwtStrategy`: Only token validation

### 99. Implementing rate limiting.
```typescript
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
    imports: [
        ThrottlerModule.forRoot({
            ttl: 60,    // Time window (seconds)
            limit: 10,  // Max requests per window
        }),
    ],
})
export class AppModule {}

@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {}
```

### 100. Deployment strategies.
- **Docker**: Containerize application
- **CI/CD**: GitHub Actions for automated deployment
- **Platforms**: Railway, Render, AWS ECS
- **Database**: MongoDB Atlas
- **Environment**: Separate dev/staging/production configs
- **Monitoring**: PM2, Winston logging, health checks

---

## Summary

This project demonstrates proficiency in:
- **Backend Development**: NestJS, Node.js, TypeScript
- **Database**: MongoDB, Mongoose, aggregation
- **Authentication**: JWT, OAuth 2.0, Passport.js
- **AI/ML Integration**: OpenAI embeddings, semantic search
- **API Design**: RESTful principles, Swagger documentation
- **Security**: Password hashing, CORS, HTTP-only cookies
