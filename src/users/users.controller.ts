import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { RegisterUserDto, LoginUserDto, UpdateUserDto, UserResponse, LoginResponse } from './dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiBody({ type: RegisterUserDto })
    @ApiResponse({ status: 201, description: 'User successfully registered' })
    @ApiResponse({ status: 409, description: 'User with this email already exists' })
    async register(@Body() dto: RegisterUserDto): Promise<UserResponse> {
        return this.usersService.register(dto);
    }

    @Post('login')
    @ApiOperation({ summary: 'Login with email and password' })
    @ApiBody({ type: LoginUserDto })
    @ApiResponse({ status: 200, description: 'Login successful, returns user and token' })
    @ApiResponse({ status: 401, description: 'Invalid email or password' })
    async login(@Body() dto: LoginUserDto): Promise<LoginResponse> {
        return this.usersService.login(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all users' })
    @ApiResponse({ status: 200, description: 'Returns list of all users' })
    async findAll(): Promise<UserResponse[]> {
        return this.usersService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get user by ID' })
    @ApiParam({ name: 'id', description: 'User ID' })
    @ApiResponse({ status: 200, description: 'Returns user details' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async findById(@Param('id') id: string): Promise<UserResponse> {
        return this.usersService.findById(id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update user by ID' })
    @ApiParam({ name: 'id', description: 'User ID' })
    @ApiBody({ type: UpdateUserDto })
    @ApiResponse({ status: 200, description: 'User updated successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateUserDto,
    ): Promise<UserResponse> {
        return this.usersService.update(id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete user by ID' })
    @ApiParam({ name: 'id', description: 'User ID' })
    @ApiResponse({ status: 200, description: 'User deleted successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async deleteById(@Param('id') id: string): Promise<{ deleted: boolean; id: string }> {
        return this.usersService.deleteById(id);
    }

    @Delete()
    @ApiOperation({ summary: 'Delete all users' })
    @ApiResponse({ status: 200, description: 'All users deleted' })
    async deleteAll(): Promise<{ deleted: boolean; count: number }> {
        return this.usersService.deleteAll();
    }
}
