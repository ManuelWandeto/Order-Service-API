import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserModel, UserRole } from '../models/User';
import { ProductModel } from '../models/Product';
import { connectDB } from '../config/db';

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seed...');

    // Connect to database
    await connectDB();

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await UserModel.deleteMany({});
    await ProductModel.deleteMany({});

    // Create admin user
    console.log('👤 Creating admin user...');
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const admin = await UserModel.create({
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    });
    console.log(`✅ Admin created: ${admin.email}`);

    // Create customer users
    console.log('👥 Creating customer users...');
    const customerPasswordHash = await bcrypt.hash('customer123', 10);
    const customer1 = await UserModel.create({
      email: 'customer1@example.com',
      passwordHash: customerPasswordHash,
      role: UserRole.CUSTOMER,
    });
    const customer2 = await UserModel.create({
      email: 'customer2@example.com',
      passwordHash: customerPasswordHash,
      role: UserRole.CUSTOMER,
    });
    console.log(`✅ Customers created: ${customer1.email}, ${customer2.email}`);

    // Create products
    console.log('📦 Creating products...');
    const products = await ProductModel.create([
      {
        name: 'Laptop',
        price: 99999, // $999.99
        stock: 10,
      },
      {
        name: 'Wireless Mouse',
        price: 2999, // $29.99
        stock: 50,
      },
      {
        name: 'Mechanical Keyboard',
        price: 12999, // $129.99
        stock: 25,
      },
      {
        name: 'USB-C Cable',
        price: 1499, // $14.99
        stock: 100,
      },
      {
        name: '27" Monitor',
        price: 34999, // $349.99
        stock: 15,
      },
    ]);
    console.log(`✅ Created ${products.length} products`);

    console.log('\n🎉 Database seeded successfully!\n');
    console.log('📋 Login Credentials:');
    console.log('Admin: admin@example.com / admin123');
    console.log('Customer: customer1@example.com / customer123');
    console.log('Customer: customer2@example.com / customer123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seedDatabase();
