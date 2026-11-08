<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            ['name' => 'Admin', 'email' => 'admin@pulsenews.com', 'password' => 'admin123', 'role' => 'admin'],
            ['name' => 'Grace Editor', 'email' => 'editor@pulsenews.com', 'password' => 'editor123', 'role' => 'editor'],
            ['name' => 'Goodluck', 'email' => 'user@pulsenews.com', 'password' => 'user123', 'role' => 'user'],
            ['name' => 'Sarah K.', 'email' => 'sarah@example.com', 'password' => 'password', 'role' => 'user'],
            ['name' => 'Mike T.', 'email' => 'mike@example.com', 'password' => 'password', 'role' => 'user'],
            ['name' => 'James R.', 'email' => 'james@example.com', 'password' => 'password', 'role' => 'user'],
            ['name' => 'Anna L.', 'email' => 'anna@example.com', 'password' => 'password', 'role' => 'user'],
            ['name' => 'Diego M.', 'email' => 'diego@example.com', 'password' => 'password', 'role' => 'user'],
        ];

        foreach ($users as $user) {
            User::updateOrCreate(
                ['email' => $user['email']],
                $user + ['status' => 'active']
            );
        }
    }
}
