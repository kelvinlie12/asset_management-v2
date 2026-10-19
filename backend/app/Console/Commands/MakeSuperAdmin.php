<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class MakeSuperAdmin extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'user:make-super-admin
                            {--name= : Nama lengkap (opsional)}
                            {--email= : Email pengguna}
                            {--password= : Kata sandi (minimal 8 karakter)}
                            {--force : Promosikan user yang sudah ada menjadi super admin}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Buat atau promosikan pengguna menjadi Super Admin tanpa unit (akses semua unit)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = $this->option('email');

        if (! $email) {
            $this->error('Email wajib diisi. Contoh: php artisan user:make-super-admin --email=admin@company.com');

            return self::FAILURE;
        }

        $existing = User::query()->where('email', $email)->first();

        if ($existing && ! $this->option('force')) {
            $this->error("Pengguna dengan email {$email} sudah ada. Gunakan --force untuk promotesikan.");

            return self::FAILURE;
        }

        if ($existing) {
            $existing->update([
                'role' => User::ROLE_SUPER_ADMIN,
                'team_id' => null,
                'status' => User::STATUS_ACTIVE,
            ]);
            $existing->syncRoleToSpatie();
            $existing->tokens()->delete();

            $this->info("Pengguna {$email} sekarang menjadi Super Admin (tanpa unit).");
            $this->line('  Token lama dicabut, silakan login ulang.');

            return self::SUCCESS;
        }

        $password = $this->option('password') ?: $this->secret('Password (min. 8 karakter)');
        $name = $this->option('name') ?: 'Super Admin';

        $validator = validator(
            ['password' => $password, 'email' => $email],
            [
                'email' => ['required', 'email', 'max:255', 'unique:users,email'],
                'password' => ['required', Password::min(8)],
            ]
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }

        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
            'role' => User::ROLE_SUPER_ADMIN,
            'team_id' => null,
            'status' => User::STATUS_ACTIVE,
        ]);

        $user->syncRoleToSpatie();

        $this->info("Super Admin dibuat: {$user->email} (tanpa unit, akses semua unit).");

        return self::SUCCESS;
    }
}
