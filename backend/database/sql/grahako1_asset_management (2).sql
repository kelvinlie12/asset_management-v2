-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Waktu pembuatan: 22 Okt 2026 pada 05.26
-- Versi server: 10.4.32-MariaDB
-- Versi PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `grahako1_asset_management`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `assets`
--

CREATE TABLE `assets` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `room_id` bigint(20) UNSIGNED DEFAULT NULL,
  `team_id` bigint(20) UNSIGNED DEFAULT NULL,
  `assigned_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `category_id` bigint(20) UNSIGNED DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `photo` varchar(255) DEFAULT NULL,
  `purchase_price` decimal(15,2) DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `placement_date` date DEFAULT NULL,
  `purchase_receipt` varchar(255) DEFAULT NULL,
  `asset_code` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `condition` varchar(255) NOT NULL DEFAULT 'GOOD',
  `usage_status` varchar(255) NOT NULL DEFAULT 'IN_STORAGE',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `assets`
--

INSERT INTO `assets` (`id`, `room_id`, `team_id`, `assigned_user_id`, `category_id`, `name`, `photo`, `purchase_price`, `purchase_date`, `placement_date`, `purchase_receipt`, `asset_code`, `description`, `condition`, `usage_status`, `created_at`, `updated_at`) VALUES
(1, 1, 5, NULL, 3, 'Fiber Optic Patch Panel', NULL, 12500000.00, '2025-04-09', NULL, 'RCPT-AST-OWN-TKN-01', 'AST-OWN-TKN-01', 'Aset awal unit Unit Teknik.', 'GOOD', 'IN_STORAGE', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(2, 1, 5, 5, 3, 'Switch Managed 24 Port', NULL, 8900000.00, '2025-03-03', NULL, 'RCPT-AST-OWN-TKN-02', 'AST-OWN-TKN-02', 'Aset awal unit Unit Teknik.', 'GOOD', 'IN_USE', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(3, 1, 5, 5, 3, 'Rack Server Rakitan', NULL, 22000000.00, '2025-08-15', NULL, 'RCPT-AST-OWN-TKN-03', 'AST-OWN-TKN-03', 'Aset awal unit Unit Teknik.', 'GOOD', 'IN_USE', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(4, 1, 5, NULL, 3, 'Kabel LAN Cat6 (roll)', NULL, 1750000.00, '2025-12-29', NULL, 'RCPT-AST-OWN-TKN-04', 'AST-OWN-TKN-04', 'Aset awal unit Unit Teknik.', 'GOOD', 'IN_STORAGE', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(5, 2, 6, 6, 2, 'Truck Box pending', NULL, 65000000.00, '2025-06-14', NULL, 'RCPT-AST-OWN-OPR-01', 'AST-OWN-OPR-01', 'Aset awal unit Unit Operasional.', 'GOOD', 'IN_USE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(6, 2, 6, 6, 3, 'Handheld Scanner', NULL, 3400000.00, '2026-06-23', NULL, 'RCPT-AST-OWN-OPR-02', 'AST-OWN-OPR-02', 'Aset awal unit Unit Operasional.', 'GOOD', 'IN_USE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(7, 2, 6, NULL, 4, 'Alat Ukur Meteran', NULL, 1200000.00, '2025-04-29', NULL, 'RCPT-AST-OWN-OPR-03', 'AST-OWN-OPR-03', 'Aset awal unit Unit Operasional.', 'GOOD', 'IN_STORAGE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(8, 2, 6, NULL, 4, 'Tangga Lipat 4 Meter', NULL, 900000.00, '2026-07-26', NULL, 'RCPT-AST-OWN-OPR-04', 'AST-OWN-OPR-04', 'Aset awal unit Unit Operasional.', 'DAMAGED', 'IN_STORAGE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(9, 3, 7, 7, 3, 'Mesin EDC BCA', NULL, 2100000.00, '2026-01-16', NULL, 'RCPT-AST-OWN-KEU-01', 'AST-OWN-KEU-01', 'Aset awal unit Unit Keuangan.', 'GOOD', 'IN_USE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(10, 3, 7, 7, 1, 'Printer Canon Kasir', NULL, 4500000.00, '2025-07-14', NULL, 'RCPT-AST-OWN-KEU-02', 'AST-OWN-KEU-02', 'Aset awal unit Unit Keuangan.', 'GOOD', 'IN_USE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(11, 3, 7, NULL, 2, 'Lemari Arsip', NULL, 3200000.00, '2025-05-20', NULL, 'RCPT-AST-OWN-KEU-03', 'AST-OWN-KEU-03', 'Aset awal unit Unit Keuangan.', 'GOOD', 'IN_STORAGE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(12, 3, 7, NULL, 3, 'Laptop Akuntansi', NULL, 13200000.00, '2025-10-23', NULL, 'RCPT-AST-OWN-KEU-04', 'AST-OWN-KEU-04', 'Aset awal unit Unit Keuangan.', 'GOOD', 'IN_STORAGE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(13, 4, 1, NULL, 5, 'Proyektor Epson', NULL, 4500000.00, '2024-01-15', NULL, 'RCPT-0001', 'AST-001', 'Proyektor untuk ruang rapat.', 'GOOD', 'IN_STORAGE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(14, 4, 1, NULL, 5, 'TV 55 Inch', NULL, 7200000.00, '2024-02-20', NULL, 'RCPT-0002', 'AST-002', 'Layar untuk presentasi.', 'GOOD', 'IN_STORAGE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(15, 8, 3, NULL, 19, 'Server Rack', NULL, 12500000.00, '2023-11-30', NULL, 'RCPT-0003', 'AST-003', 'Rak server utama.', 'GOOD', 'IN_STORAGE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(16, 5, 1, 3, 7, 'Laptop Dell Latitude', NULL, 15900000.00, '2025-03-10', NULL, 'RCPT-0004', 'AST-004', 'Laptop kerja tim pengembangan.', 'GOOD', 'IN_USE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(17, 6, 1, NULL, 6, 'Kursi Kantor Rusak', NULL, 850000.00, '2022-05-10', NULL, 'RCPT-0005', 'AST-005', 'Kursi kantor dengan kerusakan pada roda.', 'DAMAGED', 'IN_STORAGE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(18, 6, 1, NULL, 5, 'Monitor LG 27 Inch', NULL, 2900000.00, '2024-08-05', NULL, 'RCPT-0006', 'AST-006', 'Monitor cadangan untuk stok.', 'GOOD', 'IN_STORAGE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(19, 13, 5, NULL, 3, 'OLT Huawei MA5608T', NULL, 21765491.38, '2024-07-26', NULL, 'RCPT-NET-AST-NET-001', 'AST-NET-001', 'Perangkat jaringan FTTH.', 'GOOD', 'IN_USE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(20, 13, 5, NULL, 3, 'ODC Outdoor Cabinet 288 Core', NULL, 24450659.52, '2025-11-02', NULL, 'RCPT-NET-AST-NET-002', 'AST-NET-002', 'Perangkat jaringan FTTH.', 'GOOD', 'IN_USE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(21, 13, 5, NULL, 3, 'ODP Outdoor 8 Port', NULL, 18948623.63, '2025-09-02', NULL, 'RCPT-NET-AST-NET-003', 'AST-NET-003', 'Perangkat jaringan FTTH.', 'GOOD', 'IN_USE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(22, 13, 5, NULL, 3, 'ODP Outdoor 8 Port', NULL, 10341765.23, '2024-02-21', NULL, 'RCPT-NET-AST-NET-004', 'AST-NET-004', 'Perangkat jaringan FTTH.', 'GOOD', 'IN_USE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(23, 13, 5, NULL, 3, 'ODP Outdoor 8 Port', NULL, 5612538.34, '2024-08-04', NULL, 'RCPT-NET-AST-NET-005', 'AST-NET-005', 'Perangkat jaringan FTTH.', 'GOOD', 'IN_USE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(24, 13, 5, NULL, 3, 'ODP Outdoor 8 Port', NULL, 23625026.17, '2026-04-21', NULL, 'RCPT-NET-AST-NET-006', 'AST-NET-006', 'Perangkat jaringan FTTH.', 'GOOD', 'IN_USE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(25, 14, 5, NULL, 3, 'OLT ZTE C320', NULL, 8893904.40, '2025-02-19', NULL, 'RCPT-NET-AST-NET-007', 'AST-NET-007', 'Perangkat jaringan FTTH.', 'GOOD', 'IN_USE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(26, 14, 5, NULL, 3, 'ODC Outdoor Cabinet 144 Core', NULL, 1416155.67, '2024-06-17', NULL, 'RCPT-NET-AST-NET-008', 'AST-NET-008', 'Perangkat jaringan FTTH.', 'GOOD', 'IN_USE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(27, 14, 5, NULL, 3, 'ODP Outdoor 8 Port', NULL, 22410342.95, '2025-12-13', NULL, 'RCPT-NET-AST-NET-009', 'AST-NET-009', 'Perangkat jaringan FTTH.', 'GOOD', 'IN_USE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(28, 14, 5, NULL, 3, 'ODP Outdoor 8 Port', NULL, 21574404.35, '2023-12-05', NULL, 'RCPT-NET-AST-NET-010', 'AST-NET-010', 'Perangkat jaringan FTTH.', 'GOOD', 'IN_USE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(29, 14, 5, NULL, 3, 'ODP Outdoor 8 Port', NULL, 10192313.34, '2026-07-01', NULL, 'RCPT-NET-AST-NET-011', 'AST-NET-011', 'Perangkat jaringan FTTH.', 'GOOD', 'IN_USE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(30, 13, 5, NULL, 3, 'ONT FiberHome AN5506-04', NULL, 2603921.45, '2025-06-06', NULL, 'RCPT-NET-AST-NET-012', 'AST-NET-012', 'Perangkat jaringan FTTH.', 'GOOD', 'IN_USE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(31, 13, 5, NULL, 3, 'ONT FiberHome AN5506-04', NULL, 24586493.79, '2024-04-03', NULL, 'RCPT-NET-AST-NET-013', 'AST-NET-013', 'Perangkat jaringan FTTH.', 'GOOD', 'IN_USE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(32, 13, 5, NULL, 3, 'ONT FiberHome AN5506-04', NULL, 19793581.03, '2025-07-06', NULL, 'RCPT-NET-AST-NET-014', 'AST-NET-014', 'Perangkat jaringan FTTH.', 'GOOD', 'IN_USE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(33, 13, 5, NULL, 3, 'ONT FiberHome AN5506-04', NULL, 6308774.22, '2024-04-27', NULL, 'RCPT-NET-AST-NET-015', 'AST-NET-015', 'Perangkat jaringan FTTH.', 'GOOD', 'IN_USE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(34, 14, 5, NULL, 3, 'Router MikroTik CCR1036', NULL, 20227273.25, '2024-05-21', NULL, 'RCPT-NET-AST-NET-016', 'AST-NET-016', 'Perangkat jaringan FTTH.', 'GOOD', 'IN_USE', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(35, 10, 5, NULL, 3, 'ODP Outdoor 8 Port (Cadangan)', NULL, 2500000.00, '2026-08-14', NULL, 'RCPT-NET-AST-NET-017', 'AST-NET-017', 'ODP cadangan siap dipasang.', 'GOOD', 'IN_STORAGE', '2026-10-13 23:43:13', '2026-10-13 23:43:13');

-- --------------------------------------------------------

--
-- Struktur dari tabel `asset_assignments`
--

CREATE TABLE `asset_assignments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `asset_id` bigint(20) UNSIGNED DEFAULT NULL,
  `team_id` bigint(20) UNSIGNED DEFAULT NULL,
  `room_id` bigint(20) UNSIGNED DEFAULT NULL,
  `assigned_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `assigned_date` date NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `asset_assignments`
--

INSERT INTO `asset_assignments` (`id`, `asset_id`, `team_id`, `room_id`, `assigned_user_id`, `assigned_date`, `notes`, `created_at`, `updated_at`) VALUES
(1, 16, 1, 5, 3, '2025-03-12', 'Penempatan awal laptop untuk tim pengembangan.', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(2, 13, 1, 4, NULL, '2024-02-10', 'Dipinjam untuk rapat Q1, kemudian dikembalikan ke storage.', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(3, 14, 1, 4, 3, '2024-03-05', 'Digunakan untuk presentasi produk.', '2026-10-13 23:43:13', '2026-10-13 23:43:13');

-- --------------------------------------------------------

--
-- Struktur dari tabel `asset_damages`
--

CREATE TABLE `asset_damages` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `asset_id` bigint(20) UNSIGNED DEFAULT NULL,
  `room_id` bigint(20) UNSIGNED DEFAULT NULL,
  `damage_date` date NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `responsible_id` bigint(20) UNSIGNED DEFAULT NULL,
  `description` text NOT NULL,
  `photo_path` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `performed_by_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `asset_transfers`
--

CREATE TABLE `asset_transfers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `asset_id` bigint(20) UNSIGNED DEFAULT NULL,
  `transfer_date` date NOT NULL,
  `from_team_id` bigint(20) UNSIGNED DEFAULT NULL,
  `to_team_id` bigint(20) UNSIGNED DEFAULT NULL,
  `from_room_id` bigint(20) UNSIGNED DEFAULT NULL,
  `to_room_id` bigint(20) UNSIGNED DEFAULT NULL,
  `from_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `to_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `performed_by_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `event` varchar(255) NOT NULL,
  `auditable_type` varchar(255) NOT NULL,
  `auditable_id` bigint(20) UNSIGNED NOT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `url` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `user_id`, `event`, `auditable_type`, `auditable_id`, `old_values`, `new_values`, `url`, `ip_address`, `user_agent`, `created_at`, `updated_at`) VALUES
(1, 1, 'updated', 'App\\Models\\User', 6, '{\"id\":6,\"name\":\"Siti Rahma\",\"phone\":null,\"email\":\"owner.siti@example.com\",\"avatar\":null,\"role\":\"owner\",\"team_id\":6,\"status\":\"active\",\"denied_permissions\":null,\"email_verified_at\":null,\"password\":\"$2y$12$9KGfUBt2jxa9JvouVa0Pq.7en31Xn8xYAhkOUoCTAbHFR23wSnOBG\",\"remember_token\":null,\"created_at\":\"2026-10-14T06:43:12.000000Z\",\"updated_at\":\"2026-10-14T06:43:12.000000Z\"}', '{\"id\":6,\"name\":\"Siti Rahma\",\"phone\":null,\"email\":\"owner.siti@example.com\",\"avatar\":null,\"role\":\"owner\",\"team_id\":6,\"status\":\"active\",\"denied_permissions\":null,\"email_verified_at\":null,\"password\":\"$2y$12$Jh8xPGOfRJ446QzG2bLfGuLg30mz4vBAwKqJ9swdikBz9vCVjkJGG\",\"remember_token\":null,\"created_at\":\"2026-10-14 06:43:12\",\"updated_at\":\"2026-10-16 04:29:37\"}', 'http://127.0.0.1:8000/api/v1/users/6/reset-password', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36', '2026-10-15 21:29:39', '2026-10-15 21:29:39'),
(2, 1, 'updated', 'App\\Models\\Team', 5, '{\"id\":5,\"name\":\"Unit Teknik\",\"slug\":\"unit-teknik\",\"description\":\"Unit technique: jaringan, perangkat keras, dan instalasi.\",\"logo\":null,\"status\":\"active\",\"created_at\":\"2026-10-14T06:43:12.000000Z\",\"updated_at\":\"2026-10-14T06:43:12.000000Z\"}', '{\"id\":5,\"name\":\"Unit Teknik\",\"slug\":\"unit-teknik\",\"description\":\"Unit technique: jaringan, perangkat keras, dan instalasi.\",\"logo\":\"uploads\\/teams\\/logo_9234b5bf79d1eb8a0edd7330159f281c.jpg\",\"status\":\"active\",\"created_at\":\"2026-10-14 06:43:12\",\"updated_at\":\"2026-10-16 08:23:40\"}', 'http://127.0.0.1:8000/api/v1/teams/5', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36', '2026-10-16 01:23:40', '2026-10-16 01:23:40'),
(3, 1, 'created', 'App\\Models\\User', 8, NULL, '{\"name\":\"asdas\",\"email\":\"informazgt@gmail.com\",\"password\":\"$2y$12$VYHSIwS8iy8EuLCTdxA2MOIMcE63oyuCBhDsFq2W10fueM0Utg7Ym\",\"role\":\"admin\",\"team_id\":null,\"phone\":\"121414\",\"status\":\"active\",\"updated_at\":\"2026-10-17 07:03:00\",\"created_at\":\"2026-10-17 07:03:00\",\"id\":8}', 'http://127.0.0.1:8000/api/v1/users', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36', '2026-10-17 00:03:00', '2026-10-17 00:03:00'),
(4, 1, 'updated', 'App\\Models\\User', 1, '{\"id\":1,\"name\":\"Super Admin\",\"phone\":null,\"email\":\"superadmin@example.com\",\"avatar\":null,\"role\":\"super_admin\",\"team_id\":null,\"status\":\"active\",\"denied_permissions\":null,\"email_verified_at\":null,\"password\":\"$2y$12$BGRCV5Abedk8CPof7PQSheGpS4MVaBhe66vR.83.3H\\/BYADDRTid6\",\"remember_token\":null,\"created_at\":\"2026-10-14T06:43:10.000000Z\",\"updated_at\":\"2026-10-14T06:43:10.000000Z\"}', '{\"id\":1,\"name\":\"Super Admin\",\"phone\":null,\"email\":\"superadmin@example.com\",\"avatar\":\"uploads\\/avatars\\/avatar_0e5774ffe53a4046c911505136ce30a1.jpg\",\"role\":\"super_admin\",\"team_id\":null,\"status\":\"active\",\"denied_permissions\":null,\"email_verified_at\":null,\"password\":\"$2y$12$BGRCV5Abedk8CPof7PQSheGpS4MVaBhe66vR.83.3H\\/BYADDRTid6\",\"remember_token\":null,\"created_at\":\"2026-10-14 06:43:10\",\"updated_at\":\"2026-10-17 07:31:11\"}', 'http://127.0.0.1:8000/api/v1/profile', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36', '2026-10-17 00:31:11', '2026-10-17 00:31:11'),
(5, 1, 'updated', 'App\\Models\\User', 1, '{\"id\":1,\"name\":\"Super Admin\",\"phone\":null,\"email\":\"superadmin@example.com\",\"avatar\":\"uploads\\/avatars\\/avatar_0e5774ffe53a4046c911505136ce30a1.jpg\",\"role\":\"super_admin\",\"team_id\":null,\"status\":\"active\",\"denied_permissions\":null,\"email_verified_at\":null,\"password\":\"$2y$12$BGRCV5Abedk8CPof7PQSheGpS4MVaBhe66vR.83.3H\\/BYADDRTid6\",\"remember_token\":null,\"created_at\":\"2026-10-14T06:43:10.000000Z\",\"updated_at\":\"2026-10-17T07:31:11.000000Z\"}', '{\"id\":1,\"name\":\"Super Admin\",\"phone\":null,\"email\":\"superadmin@example.com\",\"avatar\":\"uploads\\/avatars\\/avatar_1354d67ee97220808c58d3a188f0d868.jpg\",\"role\":\"super_admin\",\"team_id\":null,\"status\":\"active\",\"denied_permissions\":null,\"email_verified_at\":null,\"password\":\"$2y$12$BGRCV5Abedk8CPof7PQSheGpS4MVaBhe66vR.83.3H\\/BYADDRTid6\",\"remember_token\":null,\"created_at\":\"2026-10-14 06:43:10\",\"updated_at\":\"2026-10-21 04:03:29\"}', 'http://127.0.0.1:8000/api/v1/profile', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36', '2026-10-20 21:03:29', '2026-10-20 21:03:29');

-- --------------------------------------------------------

--
-- Struktur dari tabel `cache`
--

CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `cache`
--

INSERT INTO `cache` (`key`, `value`, `expiration`) VALUES
('data-penyimpanan-demo-cache-5c785c036466adea360111aa28563bfd556b5fba', 'i:1;', 1792554798),
('data-penyimpanan-demo-cache-5c785c036466adea360111aa28563bfd556b5fba:timer', 'i:1792554798;', 1792554798),
('data-penyimpanan-demo-cache-spatie.permission.cache', 'a:3:{s:5:\"alias\";a:3:{s:1:\"a\";s:2:\"id\";s:1:\"b\";s:4:\"name\";s:1:\"c\";s:10:\"guard_name\";}s:11:\"permissions\";a:66:{i:0;a:3:{s:1:\"a\";i:1;s:1:\"b\";s:19:\"users.manage_access\";s:1:\"c\";s:3:\"web\";}i:1;a:3:{s:1:\"a\";i:2;s:1:\"b\";s:12:\"profile.view\";s:1:\"c\";s:3:\"web\";}i:2;a:3:{s:1:\"a\";i:3;s:1:\"b\";s:14:\"profile.update\";s:1:\"c\";s:3:\"web\";}i:3;a:3:{s:1:\"a\";i:4;s:1:\"b\";s:16:\"profile.password\";s:1:\"c\";s:3:\"web\";}i:4;a:3:{s:1:\"a\";i:5;s:1:\"b\";s:10:\"users.view\";s:1:\"c\";s:3:\"web\";}i:5;a:3:{s:1:\"a\";i:6;s:1:\"b\";s:12:\"users.create\";s:1:\"c\";s:3:\"web\";}i:6;a:3:{s:1:\"a\";i:7;s:1:\"b\";s:12:\"users.update\";s:1:\"c\";s:3:\"web\";}i:7;a:3:{s:1:\"a\";i:8;s:1:\"b\";s:12:\"users.delete\";s:1:\"c\";s:3:\"web\";}i:8;a:3:{s:1:\"a\";i:9;s:1:\"b\";s:13:\"system.manage\";s:1:\"c\";s:3:\"web\";}i:9;a:3:{s:1:\"a\";i:10;s:1:\"b\";s:10:\"roles.view\";s:1:\"c\";s:3:\"web\";}i:10;a:3:{s:1:\"a\";i:11;s:1:\"b\";s:12:\"roles.create\";s:1:\"c\";s:3:\"web\";}i:11;a:3:{s:1:\"a\";i:12;s:1:\"b\";s:12:\"roles.update\";s:1:\"c\";s:3:\"web\";}i:12;a:3:{s:1:\"a\";i:13;s:1:\"b\";s:12:\"roles.delete\";s:1:\"c\";s:3:\"web\";}i:13;a:3:{s:1:\"a\";i:14;s:1:\"b\";s:16:\"permissions.view\";s:1:\"c\";s:3:\"web\";}i:14;a:3:{s:1:\"a\";i:15;s:1:\"b\";s:18:\"permissions.create\";s:1:\"c\";s:3:\"web\";}i:15;a:3:{s:1:\"a\";i:16;s:1:\"b\";s:18:\"permissions.update\";s:1:\"c\";s:3:\"web\";}i:16;a:3:{s:1:\"a\";i:17;s:1:\"b\";s:18:\"permissions.delete\";s:1:\"c\";s:3:\"web\";}i:17;a:3:{s:1:\"a\";i:18;s:1:\"b\";s:10:\"teams.view\";s:1:\"c\";s:3:\"web\";}i:18;a:3:{s:1:\"a\";i:19;s:1:\"b\";s:12:\"teams.create\";s:1:\"c\";s:3:\"web\";}i:19;a:3:{s:1:\"a\";i:20;s:1:\"b\";s:12:\"teams.update\";s:1:\"c\";s:3:\"web\";}i:20;a:3:{s:1:\"a\";i:21;s:1:\"b\";s:12:\"teams.delete\";s:1:\"c\";s:3:\"web\";}i:21;a:3:{s:1:\"a\";i:22;s:1:\"b\";s:10:\"rooms.view\";s:1:\"c\";s:3:\"web\";}i:22;a:3:{s:1:\"a\";i:23;s:1:\"b\";s:12:\"rooms.create\";s:1:\"c\";s:3:\"web\";}i:23;a:3:{s:1:\"a\";i:24;s:1:\"b\";s:12:\"rooms.update\";s:1:\"c\";s:3:\"web\";}i:24;a:3:{s:1:\"a\";i:25;s:1:\"b\";s:12:\"rooms.delete\";s:1:\"c\";s:3:\"web\";}i:25;a:3:{s:1:\"a\";i:26;s:1:\"b\";s:15:\"categories.view\";s:1:\"c\";s:3:\"web\";}i:26;a:3:{s:1:\"a\";i:27;s:1:\"b\";s:17:\"categories.create\";s:1:\"c\";s:3:\"web\";}i:27;a:3:{s:1:\"a\";i:28;s:1:\"b\";s:17:\"categories.update\";s:1:\"c\";s:3:\"web\";}i:28;a:3:{s:1:\"a\";i:29;s:1:\"b\";s:17:\"categories.delete\";s:1:\"c\";s:3:\"web\";}i:29;a:3:{s:1:\"a\";i:30;s:1:\"b\";s:11:\"assets.view\";s:1:\"c\";s:3:\"web\";}i:30;a:3:{s:1:\"a\";i:31;s:1:\"b\";s:13:\"assets.create\";s:1:\"c\";s:3:\"web\";}i:31;a:3:{s:1:\"a\";i:32;s:1:\"b\";s:13:\"assets.update\";s:1:\"c\";s:3:\"web\";}i:32;a:3:{s:1:\"a\";i:33;s:1:\"b\";s:13:\"assets.delete\";s:1:\"c\";s:3:\"web\";}i:33;a:3:{s:1:\"a\";i:34;s:1:\"b\";s:14:\"purchases.view\";s:1:\"c\";s:3:\"web\";}i:34;a:3:{s:1:\"a\";i:35;s:1:\"b\";s:16:\"purchases.create\";s:1:\"c\";s:3:\"web\";}i:35;a:3:{s:1:\"a\";i:36;s:1:\"b\";s:16:\"purchases.delete\";s:1:\"c\";s:3:\"web\";}i:36;a:3:{s:1:\"a\";i:37;s:1:\"b\";s:16:\"assignments.view\";s:1:\"c\";s:3:\"web\";}i:37;a:3:{s:1:\"a\";i:38;s:1:\"b\";s:18:\"assignments.create\";s:1:\"c\";s:3:\"web\";}i:38;a:3:{s:1:\"a\";i:39;s:1:\"b\";s:14:\"transfers.view\";s:1:\"c\";s:3:\"web\";}i:39;a:3:{s:1:\"a\";i:40;s:1:\"b\";s:16:\"transfers.create\";s:1:\"c\";s:3:\"web\";}i:40;a:3:{s:1:\"a\";i:41;s:1:\"b\";s:12:\"damages.view\";s:1:\"c\";s:3:\"web\";}i:41;a:3:{s:1:\"a\";i:42;s:1:\"b\";s:14:\"damages.create\";s:1:\"c\";s:3:\"web\";}i:42;a:3:{s:1:\"a\";i:43;s:1:\"b\";s:14:\"damages.update\";s:1:\"c\";s:3:\"web\";}i:43;a:3:{s:1:\"a\";i:44;s:1:\"b\";s:14:\"damages.delete\";s:1:\"c\";s:3:\"web\";}i:44;a:3:{s:1:\"a\";i:45;s:1:\"b\";s:13:\"vehicles.view\";s:1:\"c\";s:3:\"web\";}i:45;a:3:{s:1:\"a\";i:46;s:1:\"b\";s:15:\"vehicles.create\";s:1:\"c\";s:3:\"web\";}i:46;a:3:{s:1:\"a\";i:47;s:1:\"b\";s:15:\"vehicles.update\";s:1:\"c\";s:3:\"web\";}i:47;a:3:{s:1:\"a\";i:48;s:1:\"b\";s:15:\"vehicles.delete\";s:1:\"c\";s:3:\"web\";}i:48;a:3:{s:1:\"a\";i:49;s:1:\"b\";s:18:\"vehicle_taxes.view\";s:1:\"c\";s:3:\"web\";}i:49;a:3:{s:1:\"a\";i:50;s:1:\"b\";s:20:\"vehicle_taxes.create\";s:1:\"c\";s:3:\"web\";}i:50;a:3:{s:1:\"a\";i:51;s:1:\"b\";s:20:\"vehicle_taxes.update\";s:1:\"c\";s:3:\"web\";}i:51;a:3:{s:1:\"a\";i:52;s:1:\"b\";s:20:\"vehicle_taxes.delete\";s:1:\"c\";s:3:\"web\";}i:52;a:3:{s:1:\"a\";i:53;s:1:\"b\";s:14:\"suppliers.view\";s:1:\"c\";s:3:\"web\";}i:53;a:3:{s:1:\"a\";i:54;s:1:\"b\";s:16:\"suppliers.create\";s:1:\"c\";s:3:\"web\";}i:54;a:3:{s:1:\"a\";i:55;s:1:\"b\";s:16:\"suppliers.update\";s:1:\"c\";s:3:\"web\";}i:55;a:3:{s:1:\"a\";i:56;s:1:\"b\";s:16:\"suppliers.delete\";s:1:\"c\";s:3:\"web\";}i:56;a:3:{s:1:\"a\";i:57;s:1:\"b\";s:12:\"network.view\";s:1:\"c\";s:3:\"web\";}i:57;a:3:{s:1:\"a\";i:58;s:1:\"b\";s:14:\"network.create\";s:1:\"c\";s:3:\"web\";}i:58;a:3:{s:1:\"a\";i:59;s:1:\"b\";s:14:\"network.update\";s:1:\"c\";s:3:\"web\";}i:59;a:3:{s:1:\"a\";i:60;s:1:\"b\";s:14:\"network.delete\";s:1:\"c\";s:3:\"web\";}i:60;a:3:{s:1:\"a\";i:61;s:1:\"b\";s:15:\"audit_logs.view\";s:1:\"c\";s:3:\"web\";}i:61;a:3:{s:1:\"a\";i:62;s:1:\"b\";s:10:\"tasks.view\";s:1:\"c\";s:3:\"web\";}i:62;a:3:{s:1:\"a\";i:63;s:1:\"b\";s:12:\"tasks.create\";s:1:\"c\";s:3:\"web\";}i:63;a:3:{s:1:\"a\";i:64;s:1:\"b\";s:12:\"tasks.update\";s:1:\"c\";s:3:\"web\";}i:64;a:3:{s:1:\"a\";i:65;s:1:\"b\";s:12:\"tasks.delete\";s:1:\"c\";s:3:\"web\";}i:65;a:3:{s:1:\"a\";i:66;s:1:\"b\";s:16:\"tasks.manage_all\";s:1:\"c\";s:3:\"web\";}}s:5:\"roles\";a:0:{}}', 1792641029);

-- --------------------------------------------------------

--
-- Struktur dari tabel `cache_locks`
--

CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `categories`
--

CREATE TABLE `categories` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `team_id` bigint(20) UNSIGNED DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `categories`
--

INSERT INTO `categories` (`id`, `team_id`, `name`, `code`, `description`, `status`, `created_at`, `updated_at`) VALUES
(1, NULL, 'Elektronik', 'CAT-ELE', 'Barang elektronik dan perangkat listrik.', 'active', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(2, NULL, 'Furniture', 'CAT-FUR', 'Perabotan dan perlengkapan ruangan.', 'active', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(3, NULL, 'IT Equipment', 'CAT-IT', 'Peralatan IT dan jaringan.', 'active', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(4, NULL, 'Lainnya', 'CAT-LAIN', 'Kategori lainnya.', 'inactive', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(5, 1, 'Elektronik', 'CAT-ELE', 'Barang elektronik dan perangkat listrik.', 'active', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(6, 1, 'Furniture', 'CAT-FUR', 'Perabotan dan perlengkapan ruangan.', 'active', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(7, 1, 'IT Equipment', 'CAT-IT', 'Peralatan IT dan jaringan.', 'active', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(8, 1, 'Lainnya', 'CAT-LAIN', 'Kategori lainnya.', 'inactive', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(9, 4, 'Elektronik', 'CAT-ELE', 'Barang elektronik dan perangkat listrik.', 'active', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(10, 4, 'Furniture', 'CAT-FUR', 'Perabotan dan perlengkapan ruangan.', 'active', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(11, 4, 'IT Equipment', 'CAT-IT', 'Peralatan IT dan jaringan.', 'active', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(12, 4, 'Lainnya', 'CAT-LAIN', 'Kategori lainnya.', 'inactive', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(13, 2, 'Elektronik', 'CAT-ELE', 'Barang elektronik dan perangkat listrik.', 'active', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(14, 2, 'Furniture', 'CAT-FUR', 'Perabotan dan perlengkapan ruangan.', 'active', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(15, 2, 'IT Equipment', 'CAT-IT', 'Peralatan IT dan jaringan.', 'active', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(16, 2, 'Lainnya', 'CAT-LAIN', 'Kategori lainnya.', 'inactive', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(17, 3, 'Elektronik', 'CAT-ELE', 'Barang elektronik dan perangkat listrik.', 'active', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(18, 3, 'Furniture', 'CAT-FUR', 'Perabotan dan perlengkapan ruangan.', 'active', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(19, 3, 'IT Equipment', 'CAT-IT', 'Peralatan IT dan jaringan.', 'active', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(20, 3, 'Lainnya', 'CAT-LAIN', 'Kategori lainnya.', 'inactive', '2026-10-13 23:43:11', '2026-10-13 23:43:11');

-- --------------------------------------------------------

--
-- Struktur dari tabel `failed_jobs`
--

CREATE TABLE `failed_jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `jobs`
--

CREATE TABLE `jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint(3) UNSIGNED NOT NULL,
  `reserved_at` int(10) UNSIGNED DEFAULT NULL,
  `available_at` int(10) UNSIGNED NOT NULL,
  `created_at` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `job_batches`
--

CREATE TABLE `job_batches` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` longtext NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `migrations`
--

CREATE TABLE `migrations` (
  `id` int(10) UNSIGNED NOT NULL,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `migrations`
--

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
(1, '0001_01_01_000000_create_users_table', 1),
(2, '0001_01_01_000001_create_cache_table', 1),
(3, '0001_01_01_000002_create_jobs_table', 1),
(4, '2026_08_31_181340_create_personal_access_tokens_table', 1),
(5, '2026_09_01_000001_add_role_to_users_table', 1),
(6, '2026_09_01_000010_create_teams_table', 1),
(7, '2026_09_01_000011_add_team_and_status_to_users_table', 1),
(8, '2026_09_01_000020_create_permission_tables', 1),
(9, '2026_09_01_000030_add_description_status_to_teams_table', 1),
(10, '2026_09_01_000031_create_rooms_table', 1),
(11, '2026_09_01_000032_create_assets_table', 1),
(12, '2026_09_01_000033_create_room_team_table', 1),
(13, '2026_09_01_000034_create_categories_table', 1),
(14, '2026_09_01_000035_add_category_to_assets_table', 1),
(15, '2026_09_01_000036_add_is_storage_to_rooms_table', 1),
(16, '2026_09_01_000037_restructure_assets_table', 1),
(17, '2026_09_01_000040_create_purchases_table', 1),
(18, '2026_09_01_000041_create_asset_assignments_table', 1),
(19, '2026_09_01_000042_create_asset_transfers_table', 1),
(20, '2026_09_01_000043_create_asset_damages_table', 1),
(21, '2026_09_01_000044_create_vehicle_assets_table', 1),
(22, '2026_09_04_000000_add_avatar_to_users_table', 1),
(23, '2026_09_05_000000_add_indexes_to_filter_columns', 1),
(24, '2026_09_05_000001_add_room_id_to_asset_damages_table', 1),
(25, '2026_09_05_000002_add_placement_date_to_assets_table', 1),
(26, '2026_09_10_000000_create_audit_logs_table', 1),
(27, '2026_09_11_000000_create_suppliers_table', 1),
(28, '2026_09_11_000001_add_vehicle_tax_fields_to_vehicle_assets_table', 1),
(29, '2026_09_11_000002_create_vehicle_taxes_table', 1),
(30, '2026_09_27_000000_add_placement_date_to_vehicle_assets_table', 1),
(31, '2026_10_01_000000_create_network_nodes_table', 1),
(32, '2026_10_02_000000_add_team_id_to_rooms_table', 1),
(33, '2026_10_07_000000_add_team_id_to_categories_table', 1),
(34, '2026_10_08_000000_add_users_module_to_owners', 1),
(35, '2026_10_09_000000_add_denied_permissions_to_users_table', 1),
(36, '2026_10_12_000000_grant_manage_access_to_unit_managers', 1),
(37, '2026_10_15_000000_create_settings_table', 2),
(38, '2026_10_15_000001_create_tasks_table', 3),
(39, '2026_10_15_000002_grant_tasks_module', 3),
(40, '2026_10_15_000003_add_assigned_to_tasks_table', 4),
(41, '2026_10_15_000004_create_task_activities_table', 5),
(42, '2026_10_15_000005_create_task_comments_table', 6),
(43, '2026_10_16_072614_add_logo_to_teams_table', 7),
(44, '2026_10_17_000001_add_edited_at_to_task_comments_table', 8),
(45, '2026_10_17_000002_add_work_timer_to_tasks_table', 9),
(46, '2026_10_16_000000_add_logo_to_teams_table', 10),
(47, '2026_10_18_000001_add_team_id_to_tasks_table', 10),
(48, '2026_10_18_000002_add_tasks_manage_all_permission', 10);

-- --------------------------------------------------------

--
-- Struktur dari tabel `model_has_permissions`
--

CREATE TABLE `model_has_permissions` (
  `permission_id` bigint(20) UNSIGNED NOT NULL,
  `model_type` varchar(255) NOT NULL,
  `model_id` bigint(20) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `model_has_permissions`
--

INSERT INTO `model_has_permissions` (`permission_id`, `model_type`, `model_id`) VALUES
(1, 'App\\Models\\User', 2),
(1, 'App\\Models\\User', 5),
(1, 'App\\Models\\User', 6),
(1, 'App\\Models\\User', 7),
(1, 'App\\Models\\User', 8),
(2, 'App\\Models\\User', 1),
(2, 'App\\Models\\User', 2),
(2, 'App\\Models\\User', 3),
(2, 'App\\Models\\User', 4),
(2, 'App\\Models\\User', 5),
(2, 'App\\Models\\User', 6),
(2, 'App\\Models\\User', 7),
(2, 'App\\Models\\User', 8),
(3, 'App\\Models\\User', 1),
(3, 'App\\Models\\User', 2),
(3, 'App\\Models\\User', 3),
(3, 'App\\Models\\User', 4),
(3, 'App\\Models\\User', 5),
(3, 'App\\Models\\User', 6),
(3, 'App\\Models\\User', 7),
(3, 'App\\Models\\User', 8),
(4, 'App\\Models\\User', 1),
(4, 'App\\Models\\User', 2),
(4, 'App\\Models\\User', 3),
(4, 'App\\Models\\User', 4),
(4, 'App\\Models\\User', 5),
(4, 'App\\Models\\User', 6),
(4, 'App\\Models\\User', 7),
(4, 'App\\Models\\User', 8),
(5, 'App\\Models\\User', 2),
(5, 'App\\Models\\User', 5),
(5, 'App\\Models\\User', 6),
(5, 'App\\Models\\User', 7),
(5, 'App\\Models\\User', 8),
(6, 'App\\Models\\User', 2),
(6, 'App\\Models\\User', 5),
(6, 'App\\Models\\User', 6),
(6, 'App\\Models\\User', 7),
(6, 'App\\Models\\User', 8),
(7, 'App\\Models\\User', 2),
(7, 'App\\Models\\User', 5),
(7, 'App\\Models\\User', 6),
(7, 'App\\Models\\User', 7),
(7, 'App\\Models\\User', 8),
(8, 'App\\Models\\User', 2),
(8, 'App\\Models\\User', 5),
(8, 'App\\Models\\User', 6),
(8, 'App\\Models\\User', 7),
(8, 'App\\Models\\User', 8),
(18, 'App\\Models\\User', 2),
(18, 'App\\Models\\User', 3),
(18, 'App\\Models\\User', 8),
(19, 'App\\Models\\User', 2),
(19, 'App\\Models\\User', 8),
(20, 'App\\Models\\User', 2),
(20, 'App\\Models\\User', 8),
(21, 'App\\Models\\User', 2),
(21, 'App\\Models\\User', 8),
(22, 'App\\Models\\User', 2),
(22, 'App\\Models\\User', 3),
(22, 'App\\Models\\User', 8),
(23, 'App\\Models\\User', 2),
(23, 'App\\Models\\User', 8),
(24, 'App\\Models\\User', 2),
(24, 'App\\Models\\User', 8),
(25, 'App\\Models\\User', 2),
(25, 'App\\Models\\User', 8),
(26, 'App\\Models\\User', 2),
(26, 'App\\Models\\User', 3),
(26, 'App\\Models\\User', 7),
(26, 'App\\Models\\User', 8),
(27, 'App\\Models\\User', 2),
(27, 'App\\Models\\User', 7),
(27, 'App\\Models\\User', 8),
(28, 'App\\Models\\User', 2),
(28, 'App\\Models\\User', 7),
(28, 'App\\Models\\User', 8),
(29, 'App\\Models\\User', 2),
(29, 'App\\Models\\User', 7),
(29, 'App\\Models\\User', 8),
(30, 'App\\Models\\User', 2),
(30, 'App\\Models\\User', 3),
(30, 'App\\Models\\User', 5),
(30, 'App\\Models\\User', 6),
(30, 'App\\Models\\User', 7),
(30, 'App\\Models\\User', 8),
(31, 'App\\Models\\User', 2),
(31, 'App\\Models\\User', 5),
(31, 'App\\Models\\User', 6),
(31, 'App\\Models\\User', 7),
(31, 'App\\Models\\User', 8),
(32, 'App\\Models\\User', 2),
(32, 'App\\Models\\User', 5),
(32, 'App\\Models\\User', 6),
(32, 'App\\Models\\User', 7),
(32, 'App\\Models\\User', 8),
(33, 'App\\Models\\User', 2),
(33, 'App\\Models\\User', 5),
(33, 'App\\Models\\User', 6),
(33, 'App\\Models\\User', 7),
(33, 'App\\Models\\User', 8),
(34, 'App\\Models\\User', 2),
(34, 'App\\Models\\User', 3),
(34, 'App\\Models\\User', 6),
(34, 'App\\Models\\User', 7),
(34, 'App\\Models\\User', 8),
(35, 'App\\Models\\User', 2),
(35, 'App\\Models\\User', 6),
(35, 'App\\Models\\User', 7),
(35, 'App\\Models\\User', 8),
(36, 'App\\Models\\User', 2),
(36, 'App\\Models\\User', 6),
(36, 'App\\Models\\User', 7),
(36, 'App\\Models\\User', 8),
(37, 'App\\Models\\User', 2),
(37, 'App\\Models\\User', 3),
(37, 'App\\Models\\User', 5),
(37, 'App\\Models\\User', 6),
(37, 'App\\Models\\User', 7),
(37, 'App\\Models\\User', 8),
(38, 'App\\Models\\User', 2),
(38, 'App\\Models\\User', 5),
(38, 'App\\Models\\User', 6),
(38, 'App\\Models\\User', 7),
(38, 'App\\Models\\User', 8),
(39, 'App\\Models\\User', 2),
(39, 'App\\Models\\User', 3),
(39, 'App\\Models\\User', 6),
(39, 'App\\Models\\User', 8),
(40, 'App\\Models\\User', 2),
(40, 'App\\Models\\User', 6),
(40, 'App\\Models\\User', 8),
(41, 'App\\Models\\User', 2),
(41, 'App\\Models\\User', 3),
(41, 'App\\Models\\User', 5),
(41, 'App\\Models\\User', 6),
(41, 'App\\Models\\User', 7),
(41, 'App\\Models\\User', 8),
(42, 'App\\Models\\User', 2),
(42, 'App\\Models\\User', 5),
(42, 'App\\Models\\User', 6),
(42, 'App\\Models\\User', 7),
(42, 'App\\Models\\User', 8),
(43, 'App\\Models\\User', 2),
(43, 'App\\Models\\User', 5),
(43, 'App\\Models\\User', 6),
(43, 'App\\Models\\User', 7),
(43, 'App\\Models\\User', 8),
(44, 'App\\Models\\User', 2),
(44, 'App\\Models\\User', 5),
(44, 'App\\Models\\User', 6),
(44, 'App\\Models\\User', 7),
(44, 'App\\Models\\User', 8),
(45, 'App\\Models\\User', 2),
(45, 'App\\Models\\User', 3),
(45, 'App\\Models\\User', 6),
(45, 'App\\Models\\User', 8),
(46, 'App\\Models\\User', 2),
(46, 'App\\Models\\User', 6),
(46, 'App\\Models\\User', 8),
(47, 'App\\Models\\User', 2),
(47, 'App\\Models\\User', 6),
(47, 'App\\Models\\User', 8),
(48, 'App\\Models\\User', 2),
(48, 'App\\Models\\User', 6),
(48, 'App\\Models\\User', 8),
(49, 'App\\Models\\User', 2),
(49, 'App\\Models\\User', 6),
(49, 'App\\Models\\User', 8),
(50, 'App\\Models\\User', 2),
(50, 'App\\Models\\User', 6),
(50, 'App\\Models\\User', 8),
(51, 'App\\Models\\User', 2),
(51, 'App\\Models\\User', 6),
(51, 'App\\Models\\User', 8),
(52, 'App\\Models\\User', 2),
(52, 'App\\Models\\User', 6),
(52, 'App\\Models\\User', 8),
(53, 'App\\Models\\User', 2),
(53, 'App\\Models\\User', 7),
(53, 'App\\Models\\User', 8),
(54, 'App\\Models\\User', 2),
(54, 'App\\Models\\User', 7),
(54, 'App\\Models\\User', 8),
(55, 'App\\Models\\User', 2),
(55, 'App\\Models\\User', 7),
(55, 'App\\Models\\User', 8),
(56, 'App\\Models\\User', 2),
(56, 'App\\Models\\User', 7),
(56, 'App\\Models\\User', 8),
(57, 'App\\Models\\User', 2),
(57, 'App\\Models\\User', 3),
(57, 'App\\Models\\User', 5),
(57, 'App\\Models\\User', 8),
(58, 'App\\Models\\User', 2),
(58, 'App\\Models\\User', 5),
(58, 'App\\Models\\User', 8),
(59, 'App\\Models\\User', 2),
(59, 'App\\Models\\User', 5),
(59, 'App\\Models\\User', 8),
(60, 'App\\Models\\User', 2),
(60, 'App\\Models\\User', 5),
(60, 'App\\Models\\User', 8),
(61, 'App\\Models\\User', 2),
(61, 'App\\Models\\User', 8),
(62, 'App\\Models\\User', 2),
(62, 'App\\Models\\User', 3),
(62, 'App\\Models\\User', 4),
(62, 'App\\Models\\User', 5),
(62, 'App\\Models\\User', 6),
(62, 'App\\Models\\User', 7),
(62, 'App\\Models\\User', 8),
(63, 'App\\Models\\User', 2),
(63, 'App\\Models\\User', 3),
(63, 'App\\Models\\User', 4),
(63, 'App\\Models\\User', 5),
(63, 'App\\Models\\User', 6),
(63, 'App\\Models\\User', 7),
(63, 'App\\Models\\User', 8),
(64, 'App\\Models\\User', 2),
(64, 'App\\Models\\User', 5),
(64, 'App\\Models\\User', 6),
(64, 'App\\Models\\User', 7),
(64, 'App\\Models\\User', 8),
(65, 'App\\Models\\User', 2),
(65, 'App\\Models\\User', 5),
(65, 'App\\Models\\User', 6),
(65, 'App\\Models\\User', 7),
(65, 'App\\Models\\User', 8);

-- --------------------------------------------------------

--
-- Struktur dari tabel `model_has_roles`
--

CREATE TABLE `model_has_roles` (
  `role_id` bigint(20) UNSIGNED NOT NULL,
  `model_type` varchar(255) NOT NULL,
  `model_id` bigint(20) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `model_has_roles`
--

INSERT INTO `model_has_roles` (`role_id`, `model_type`, `model_id`) VALUES
(1, 'App\\Models\\User', 1),
(2, 'App\\Models\\User', 2),
(2, 'App\\Models\\User', 8),
(3, 'App\\Models\\User', 5),
(3, 'App\\Models\\User', 6),
(3, 'App\\Models\\User', 7),
(4, 'App\\Models\\User', 3),
(5, 'App\\Models\\User', 4);

-- --------------------------------------------------------

--
-- Struktur dari tabel `network_nodes`
--

CREATE TABLE `network_nodes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `asset_id` bigint(20) UNSIGNED NOT NULL,
  `room_id` bigint(20) UNSIGNED NOT NULL,
  `parent_id` bigint(20) UNSIGNED DEFAULT NULL,
  `node_type` varchar(255) NOT NULL,
  `label` varchar(255) DEFAULT NULL,
  `pon_port` varchar(255) DEFAULT NULL,
  `splitter_ratio` varchar(255) DEFAULT NULL,
  `port_capacity` int(10) UNSIGNED DEFAULT NULL,
  `port_used` int(10) UNSIGNED DEFAULT 0,
  `customer_count` int(10) UNSIGNED DEFAULT 0,
  `rx_power_dbm` decimal(6,2) DEFAULT NULL,
  `area` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'ACTIVE',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `network_nodes`
--

INSERT INTO `network_nodes` (`id`, `asset_id`, `room_id`, `parent_id`, `node_type`, `label`, `pon_port`, `splitter_ratio`, `port_capacity`, `port_used`, `customer_count`, `rx_power_dbm`, `area`, `status`, `notes`, `created_at`, `updated_at`) VALUES
(1, 19, 13, NULL, 'OLT', 'OLT Site A', 'PON 0/1/2', '1:8', 8, 8, 48, NULL, 'Kel. Sukamaju', 'ACTIVE', NULL, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(2, 20, 13, 1, 'ODC', 'ODC Site A', 'PON 0', '1:4', 4, 4, 32, NULL, 'Kel. Sukamaju', 'ACTIVE', 'Pelanggan di sekitar RT 01 - RT 04.', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(3, 21, 13, 2, 'ODP', 'ODP Sukamaju - RT 01', 'PON 0', '1:8', 8, 8, 8, NULL, 'RT 01', 'ACTIVE', NULL, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(4, 22, 13, 2, 'ODP', 'ODP Sukamaju - RT 02', 'PON 0', '1:8', 8, 8, 8, NULL, 'RT 02', 'ACTIVE', NULL, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(5, 23, 13, 2, 'ODP', 'ODP Sukamaju - RT 03', 'PON 0', '1:8', 8, 6, 6, NULL, 'RT 03', 'ACTIVE', NULL, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(6, 24, 13, 2, 'ODP', 'ODP Sukamaju - RT 04', 'PON 0', '1:8', 8, 6, 6, NULL, 'RT 04', 'MAINTENANCE', 'Gangguan link, sedang dalam penanganan.', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(7, 25, 14, NULL, 'OLT', 'OLT Site B', 'PON 0/1', '1:4', 4, 4, 22, NULL, 'Kel. Harapan Baru', 'ACTIVE', NULL, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(8, 26, 14, 7, 'ODC', 'ODC Site B', 'PON 1', '1:4', 4, 3, 18, NULL, 'Kel. Harapan Baru', 'ACTIVE', NULL, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(9, 27, 14, 8, 'ODP', 'ODP Harapan Baru - Blok A', 'PON 1', '1:8', 8, 8, 8, NULL, 'Blok A', 'ACTIVE', NULL, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(10, 28, 14, 8, 'ODP', 'ODP Harapan Baru - Blok B', 'PON 1', '1:8', 8, 5, 5, NULL, 'Blok B', 'ACTIVE', NULL, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(11, 29, 14, 8, 'ODP', 'ODP Harapan Baru - Blok C', 'PON 1', '1:8', 8, 5, 5, NULL, 'Blok C', 'INACTIVE', 'Belum ada pelanggan aktif.', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(12, 30, 13, 3, 'ONT', 'ONT Ahmad Basuki', 'PON 0', NULL, 1, 1, 1, -18.20, 'RT 01 / RT 02', 'ACTIVE', 'Pelanggan: Ahmad Basuki.', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(13, 31, 13, 3, 'ONT', 'ONT Siti Rahayu', 'PON 0', NULL, 1, 1, 1, -21.50, 'RT 01 / RT 02', 'ACTIVE', 'Pelanggan: Siti Rahayu.', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(14, 32, 13, 3, 'ONT', 'ONT Budi Santoso', 'PON 0', NULL, 1, 1, 1, -23.10, 'RT 01 / RT 02', 'ACTIVE', 'Pelanggan: Budi Santoso.', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(15, 33, 13, 3, 'ONT', 'ONT Dewi Lestari', 'PON 0', NULL, 1, 1, 1, -19.80, 'RT 01 / RT 02', 'ACTIVE', 'Pelanggan: Dewi Lestari.', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(16, 34, 14, 7, 'ROUTER', 'Router Core Site B', NULL, NULL, 36, 12, 0, NULL, 'Kel. Harapan Baru', 'ACTIVE', NULL, '2026-10-13 23:43:13', '2026-10-13 23:43:13');

-- --------------------------------------------------------

--
-- Struktur dari tabel `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `permissions`
--

CREATE TABLE `permissions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `guard_name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `permissions`
--

INSERT INTO `permissions` (`id`, `name`, `guard_name`, `created_at`, `updated_at`) VALUES
(1, 'users.manage_access', 'web', '2026-10-13 23:43:10', '2026-10-13 23:43:10'),
(2, 'profile.view', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(3, 'profile.update', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(4, 'profile.password', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(5, 'users.view', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(6, 'users.create', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(7, 'users.update', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(8, 'users.delete', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(9, 'system.manage', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(10, 'roles.view', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(11, 'roles.create', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(12, 'roles.update', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(13, 'roles.delete', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(14, 'permissions.view', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(15, 'permissions.create', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(16, 'permissions.update', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(17, 'permissions.delete', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(18, 'teams.view', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(19, 'teams.create', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(20, 'teams.update', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(21, 'teams.delete', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(22, 'rooms.view', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(23, 'rooms.create', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(24, 'rooms.update', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(25, 'rooms.delete', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(26, 'categories.view', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(27, 'categories.create', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(28, 'categories.update', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(29, 'categories.delete', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(30, 'assets.view', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(31, 'assets.create', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(32, 'assets.update', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(33, 'assets.delete', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(34, 'purchases.view', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(35, 'purchases.create', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(36, 'purchases.delete', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(37, 'assignments.view', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(38, 'assignments.create', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(39, 'transfers.view', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(40, 'transfers.create', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(41, 'damages.view', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(42, 'damages.create', 'web', '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(43, 'damages.update', 'web', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(44, 'damages.delete', 'web', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(45, 'vehicles.view', 'web', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(46, 'vehicles.create', 'web', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(47, 'vehicles.update', 'web', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(48, 'vehicles.delete', 'web', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(49, 'vehicle_taxes.view', 'web', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(50, 'vehicle_taxes.create', 'web', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(51, 'vehicle_taxes.update', 'web', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(52, 'vehicle_taxes.delete', 'web', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(53, 'suppliers.view', 'web', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(54, 'suppliers.create', 'web', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(55, 'suppliers.update', 'web', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(56, 'suppliers.delete', 'web', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(57, 'network.view', 'web', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(58, 'network.create', 'web', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(59, 'network.update', 'web', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(60, 'network.delete', 'web', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(61, 'audit_logs.view', 'web', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(62, 'tasks.view', 'web', '2026-10-15 00:39:26', '2026-10-15 00:39:26'),
(63, 'tasks.create', 'web', '2026-10-15 00:39:26', '2026-10-15 00:39:26'),
(64, 'tasks.update', 'web', '2026-10-15 00:39:26', '2026-10-15 00:39:26'),
(65, 'tasks.delete', 'web', '2026-10-15 00:39:26', '2026-10-15 00:39:26'),
(66, 'tasks.manage_all', 'web', '2026-10-18 00:31:56', '2026-10-18 00:31:56');

-- --------------------------------------------------------

--
-- Struktur dari tabel `personal_access_tokens`
--

CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) UNSIGNED NOT NULL,
  `name` text NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `personal_access_tokens`
--

INSERT INTO `personal_access_tokens` (`id`, `tokenable_type`, `tokenable_id`, `name`, `token`, `abilities`, `last_used_at`, `expires_at`, `created_at`, `updated_at`) VALUES
(4, 'App\\Models\\User', 2, 'auth-token', '9ccc024e5b8d6dad7b3ad48df6a89c8c46a07d0c36d13a20c1e148e9dae2489e', '[\"users.manage_access\",\"profile.view\",\"profile.update\",\"profile.password\",\"users.view\",\"users.create\",\"users.update\",\"users.delete\",\"teams.view\",\"teams.create\",\"teams.update\",\"teams.delete\",\"rooms.view\",\"rooms.create\",\"rooms.update\",\"rooms.delete\",\"categories.view\",\"categories.create\",\"categories.update\",\"categories.delete\",\"assets.view\",\"assets.create\",\"assets.update\",\"assets.delete\",\"purchases.view\",\"purchases.create\",\"purchases.delete\",\"assignments.view\",\"assignments.create\",\"transfers.view\",\"transfers.create\",\"damages.view\",\"damages.create\",\"damages.update\",\"damages.delete\",\"vehicles.view\",\"vehicles.create\",\"vehicles.update\",\"vehicles.delete\",\"vehicle_taxes.view\",\"vehicle_taxes.create\",\"vehicle_taxes.update\",\"vehicle_taxes.delete\",\"suppliers.view\",\"suppliers.create\",\"suppliers.update\",\"suppliers.delete\",\"network.view\",\"network.create\",\"network.update\",\"network.delete\",\"audit_logs.view\"]', NULL, NULL, '2026-10-13 23:48:50', '2026-10-13 23:48:50'),
(70, 'App\\Models\\User', 8, 'auth-token', 'f18fc1bdf4d15e7995debd31cc2a1442c388c2deabdc310de261c5a6a937b76e', '[\"users.manage_access\",\"profile.view\",\"profile.update\",\"profile.password\",\"users.view\",\"users.create\",\"users.update\",\"users.delete\",\"teams.view\",\"teams.create\",\"teams.update\",\"teams.delete\",\"rooms.view\",\"rooms.create\",\"rooms.update\",\"rooms.delete\",\"categories.view\",\"categories.create\",\"categories.update\",\"categories.delete\",\"assets.view\",\"assets.create\",\"assets.update\",\"assets.delete\",\"purchases.view\",\"purchases.create\",\"purchases.delete\",\"assignments.view\",\"assignments.create\",\"transfers.view\",\"transfers.create\",\"damages.view\",\"damages.create\",\"damages.update\",\"damages.delete\",\"vehicles.view\",\"vehicles.create\",\"vehicles.update\",\"vehicles.delete\",\"vehicle_taxes.view\",\"vehicle_taxes.create\",\"vehicle_taxes.update\",\"vehicle_taxes.delete\",\"suppliers.view\",\"suppliers.create\",\"suppliers.update\",\"suppliers.delete\",\"network.view\",\"network.create\",\"network.update\",\"network.delete\",\"audit_logs.view\",\"tasks.view\",\"tasks.create\",\"tasks.update\",\"tasks.delete\"]', '2026-10-17 00:35:23', NULL, '2026-10-17 00:03:39', '2026-10-17 00:35:23'),
(77, 'App\\Models\\User', 5, 'auth-token', '3e8f6314f6399515c79fc306ba87d3c026fcec0e0efa8b25998048f7419afafa', '[\"users.manage_access\",\"profile.view\",\"profile.update\",\"profile.password\",\"users.view\",\"users.create\",\"users.update\",\"users.delete\",\"assets.view\",\"assets.create\",\"assets.update\",\"assets.delete\",\"assignments.view\",\"assignments.create\",\"damages.view\",\"damages.create\",\"damages.update\",\"damages.delete\",\"network.view\",\"network.create\",\"network.update\",\"network.delete\",\"tasks.view\",\"tasks.create\",\"tasks.update\",\"tasks.delete\"]', '2026-10-17 23:17:17', NULL, '2026-10-17 22:21:45', '2026-10-17 23:17:17'),
(91, 'App\\Models\\User', 3, 'auth-token', '28d8c738b264393133aa1a78852361e282a9aad85415f6aabbc30b65e914862b', '[\"profile.view\",\"profile.update\",\"profile.password\",\"teams.view\",\"rooms.view\",\"categories.view\",\"assets.view\",\"purchases.view\",\"assignments.view\",\"transfers.view\",\"damages.view\",\"vehicles.view\",\"network.view\",\"tasks.view\",\"tasks.create\"]', '2026-10-18 00:46:42', NULL, '2026-10-18 00:46:39', '2026-10-18 00:46:42'),
(96, 'App\\Models\\User', 4, 'auth-token', '16b6ead521a56af1ce9db841df59c388230cbf2a0354471e272631a5067ce95d', '[\"profile.view\",\"profile.update\",\"profile.password\",\"tasks.view\",\"tasks.create\"]', '2026-10-18 00:49:28', NULL, '2026-10-18 00:49:18', '2026-10-18 00:49:28'),
(102, 'App\\Models\\User', 1, 'auth-token', 'da436ed979ab26a8b38b0e5cc0ae419deb252fca775599aec9308db752d3012c', '[\"profile.view\",\"profile.update\",\"profile.password\",\"assets.create\",\"assets.delete\",\"assets.update\",\"assets.view\",\"assignments.create\",\"assignments.view\",\"audit_logs.view\",\"categories.create\",\"categories.delete\",\"categories.update\",\"categories.view\",\"damages.create\",\"damages.delete\",\"damages.update\",\"damages.view\",\"network.create\",\"network.delete\",\"network.update\",\"network.view\",\"permissions.create\",\"permissions.delete\",\"permissions.update\",\"permissions.view\",\"purchases.create\",\"purchases.delete\",\"purchases.view\",\"roles.create\",\"roles.delete\",\"roles.update\",\"roles.view\",\"rooms.create\",\"rooms.delete\",\"rooms.update\",\"rooms.view\",\"suppliers.create\",\"suppliers.delete\",\"suppliers.update\",\"suppliers.view\",\"system.manage\",\"tasks.create\",\"tasks.delete\",\"tasks.manage_all\",\"tasks.update\",\"tasks.view\",\"teams.create\",\"teams.delete\",\"teams.update\",\"teams.view\",\"transfers.create\",\"transfers.view\",\"users.create\",\"users.delete\",\"users.manage_access\",\"users.update\",\"users.view\",\"vehicle_taxes.create\",\"vehicle_taxes.delete\",\"vehicle_taxes.update\",\"vehicle_taxes.view\",\"vehicles.create\",\"vehicles.delete\",\"vehicles.update\",\"vehicles.view\"]', '2026-10-21 03:06:40', NULL, '2026-10-20 20:52:18', '2026-10-21 03:06:40');

-- --------------------------------------------------------

--
-- Struktur dari tabel `purchases`
--

CREATE TABLE `purchases` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `purchase_number` varchar(255) NOT NULL,
  `supplier` varchar(255) NOT NULL,
  `invoice_number` varchar(255) NOT NULL,
  `purchase_date` date NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `proof_path` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `asset_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `purchases`
--

INSERT INTO `purchases` (`id`, `purchase_number`, `supplier`, `invoice_number`, `purchase_date`, `amount`, `proof_path`, `notes`, `asset_id`, `created_at`, `updated_at`) VALUES
(1, 'PCH-0001', 'PT Elektronik Sentral', 'INV-2024/001', '2024-01-15', 4500000.00, 'uploads/purchases/demo-proof.png', 'Pembelian proyektor untuk ruang rapat.', 13, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(2, 'PCH-0002', 'PT Komputer Jaya', 'INV-2025/004', '2025-03-10', 15900000.00, 'uploads/purchases/demo-proof.png', 'Pembelian laptop untuk tim pengembangan.', 16, '2026-10-13 23:43:13', '2026-10-13 23:43:13');

-- --------------------------------------------------------

--
-- Struktur dari tabel `roles`
--

CREATE TABLE `roles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `guard_name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `roles`
--

INSERT INTO `roles` (`id`, `name`, `guard_name`, `created_at`, `updated_at`) VALUES
(1, 'super_admin', 'web', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(2, 'admin', 'web', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(3, 'owner', 'web', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(4, 'staff', 'web', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(5, 'viewer', 'web', '2026-10-13 23:43:12', '2026-10-13 23:43:12');

-- --------------------------------------------------------

--
-- Struktur dari tabel `role_has_permissions`
--

CREATE TABLE `role_has_permissions` (
  `permission_id` bigint(20) UNSIGNED NOT NULL,
  `role_id` bigint(20) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `rooms`
--

CREATE TABLE `rooms` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `team_id` bigint(20) UNSIGNED DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `is_storage` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `rooms`
--

INSERT INTO `rooms` (`id`, `team_id`, `name`, `location`, `description`, `status`, `is_storage`, `created_at`, `updated_at`) VALUES
(1, 5, 'Ruang Unit Teknik', 'Lantai 1', 'Ruang kerja unit teknik.', 'active', 0, '2026-10-13 23:43:12', '2026-10-13 23:43:13'),
(2, 6, 'Ruang Unit Operasional', 'Lantai 1', 'Ruang kerja unit operasional.', 'active', 0, '2026-10-13 23:43:12', '2026-10-13 23:43:13'),
(3, 7, 'Ruang Unit Keuangan', 'Lantai 1', 'Ruang kerja unit keuangan.', 'active', 0, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(4, 1, 'Ruang Rapat A', 'Lantai 1', 'Ruang rapat utama unit.', 'active', 0, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(5, 1, 'Ruang Rapat B', 'Lantai 1', 'Ruang rapat kecil unit.', 'active', 0, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(6, 1, 'Gudang', 'Gudang Lantai 1', 'Gudang / storage unit.', 'active', 1, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(7, 2, 'Ruang Kreatif', 'Lantai 1', 'Ruang kerja kreatif unit.', 'active', 0, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(8, 3, 'Server Room', 'Lantai 2', 'Ruang server dan perangkat jaringan unit.', 'active', 0, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(9, 3, 'Gudang Operasional', 'Lantai 1', 'Gudang penyimpanan unit.', 'active', 1, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(10, 5, 'Gudang Unit Teknik', 'Lantai 1', 'Gudang unit teknik.', 'active', 1, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(11, 6, 'Gudang Unit Operasional', 'Lantai 1', 'Gudang unit operasional.', 'active', 1, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(12, 7, 'Ruang Arsip', 'Lantai 2', 'Ruang arsip dokumen unit.', 'active', 0, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(13, 5, 'Site Tower A', 'Jl. Raya Sukamaju No. 10', 'Site FTTH menara A.', 'active', 0, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(14, 5, 'Site Tower B', 'Jl. Harapan Baru No. 22', 'Site FTTH menara B.', 'active', 0, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(15, 5, 'Site Tower C', 'Jl. Pemuda No. 5', 'Site FTTH menara C (baru).', 'inactive', 0, '2026-10-13 23:43:13', '2026-10-13 23:43:13');

-- --------------------------------------------------------

--
-- Struktur dari tabel `sessions`
--

CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `settings`
--

CREATE TABLE `settings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `key` varchar(255) NOT NULL,
  `value` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `settings`
--

INSERT INTO `settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES
(1, 'company_logo', NULL, '2026-10-14 23:52:48', '2026-10-16 01:24:30'),
(3, 'company_name', NULL, '2026-10-15 20:37:52', '2026-10-16 01:24:30');

-- --------------------------------------------------------

--
-- Struktur dari tabel `suppliers`
--

CREATE TABLE `suppliers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `contact_person` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `suppliers`
--

INSERT INTO `suppliers` (`id`, `name`, `contact_person`, `phone`, `email`, `address`, `notes`, `created_at`, `updated_at`) VALUES
(1, 'PT Astra Honda Motor', 'Budi Santoso', '021-12345678', 'sales@ahm.co.id', 'Jakarta', 'Distributor resmi sepeda motor Honda.', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(2, 'PT Yamaha Indonesia Motor Manufacturing', 'Siti Rahma', '021-87654321', 'sales@yamaha-motor.co.id', 'Jakarta', 'Distributor resmi sepeda motor Yamaha.', '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(3, 'PT Suzuki Indomobil Motor', 'Agus Wijaya', '021-11223344', 'sales@suzuki.co.id', 'Jakarta', 'Distributor resmi sepeda motor Suzuki.', '2026-10-13 23:43:13', '2026-10-13 23:43:13');

-- --------------------------------------------------------

--
-- Struktur dari tabel `tasks`
--

CREATE TABLE `tasks` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(255) NOT NULL,
  `category` varchar(255) NOT NULL DEFAULT 'bug_system',
  `page` varchar(255) DEFAULT NULL,
  `description` text NOT NULL,
  `priority` varchar(255) NOT NULL DEFAULT 'medium',
  `status` varchar(255) NOT NULL DEFAULT 'open',
  `attachment_path` varchar(255) DEFAULT NULL,
  `reporter_id` bigint(20) UNSIGNED DEFAULT NULL,
  `team_id` bigint(20) UNSIGNED DEFAULT NULL,
  `handled_by` bigint(20) UNSIGNED DEFAULT NULL,
  `assigned_to` bigint(20) UNSIGNED DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `work_started_at` timestamp NULL DEFAULT NULL,
  `worked_seconds` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `tasks`
--

INSERT INTO `tasks` (`id`, `title`, `category`, `page`, `description`, `priority`, `status`, `attachment_path`, `reporter_id`, `team_id`, `handled_by`, `assigned_to`, `resolved_at`, `work_started_at`, `worked_seconds`, `created_at`, `updated_at`) VALUES
(14, 'sadasda', 'bug_system', 'Users', 'adasda', 'medium', 'resolved', NULL, 1, NULL, 1, 8, '2026-10-16 02:58:53', NULL, 0, '2026-10-15 21:15:13', '2026-10-17 00:04:00'),
(15, 'adasa', 'bug_system', 'Vehicles per Unit', 'asdadsasda', 'medium', 'paused', 'uploads/tasks/task_3f347d41380f9c2879df94fe9cce8ae5.jpg', 1, NULL, 1, 1, NULL, NULL, 3149, '2026-10-15 21:15:54', '2026-10-17 23:06:45'),
(36, 'dadad', 'bug_system', 'Rooms', 'adasda', 'medium', 'resolved', NULL, 1, NULL, 5, 8, '2026-10-17 02:08:46', NULL, 2, '2026-10-17 00:34:48', '2026-10-17 02:08:46'),
(37, 'asdada', 'bug_system', 'Storage', 'adsadada', 'medium', 'resolved', NULL, 1, NULL, 1, 8, '2026-10-17 22:30:39', NULL, 22, '2026-10-17 00:35:05', '2026-10-17 22:30:39');

-- --------------------------------------------------------

--
-- Struktur dari tabel `task_activities`
--

CREATE TABLE `task_activities` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `task_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `meta` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `task_activities`
--

INSERT INTO `task_activities` (`id`, `task_id`, `user_id`, `action`, `meta`, `created_at`, `updated_at`) VALUES
(17, 14, 1, 'created', NULL, '2026-10-15 21:15:13', '2026-10-15 21:15:13'),
(18, 15, 1, 'created', NULL, '2026-10-15 21:15:54', '2026-10-15 21:15:54'),
(24, 14, 1, 'started', '{\"from\":\"open\",\"to\":\"in_progress\"}', '2026-10-16 02:58:47', '2026-10-16 02:58:47'),
(25, 14, 1, 'resolved', '{\"from\":\"in_progress\",\"to\":\"resolved\"}', '2026-10-16 02:58:53', '2026-10-16 02:58:53'),
(42, 15, 1, 'assigned', '{\"to_id\":8,\"to_name\":\"asdas\"}', '2026-10-17 00:03:52', '2026-10-17 00:03:52'),
(43, 14, 1, 'assigned', '{\"to_id\":8,\"to_name\":\"asdas\"}', '2026-10-17 00:04:00', '2026-10-17 00:04:00'),
(44, 15, 8, 'started', '{\"from\":\"open\",\"to\":\"in_progress\"}', '2026-10-17 00:04:17', '2026-10-17 00:04:17'),
(62, 36, 1, 'created', NULL, '2026-10-17 00:34:48', '2026-10-17 00:34:48'),
(63, 36, 1, 'assigned', '{\"to_id\":\"8\",\"to_name\":\"asdas\"}', '2026-10-17 00:34:48', '2026-10-17 00:34:48'),
(64, 37, 1, 'created', NULL, '2026-10-17 00:35:05', '2026-10-17 00:35:05'),
(65, 37, 1, 'assigned', '{\"to_id\":\"8\",\"to_name\":\"asdas\"}', '2026-10-17 00:35:05', '2026-10-17 00:35:05'),
(66, 37, 1, 'started', '{\"from\":\"open\",\"to\":\"in_progress\"}', '2026-10-17 00:35:10', '2026-10-17 00:35:10'),
(67, 37, 1, 'paused', '{\"from\":\"in_progress\",\"to\":\"paused\"}', '2026-10-17 00:35:16', '2026-10-17 00:35:16'),
(78, 15, 1, 'paused', '{\"from\":\"in_progress\",\"to\":\"paused\"}', '2026-10-17 00:56:46', '2026-10-17 00:56:46'),
(79, 37, 1, 'resumed', '{\"from\":\"paused\",\"to\":\"in_progress\"}', '2026-10-17 00:56:54', '2026-10-17 00:56:54'),
(80, 37, 1, 'paused', '{\"from\":\"in_progress\",\"to\":\"paused\"}', '2026-10-17 00:57:03', '2026-10-17 00:57:03'),
(81, 37, 1, 'resumed', '{\"from\":\"paused\",\"to\":\"in_progress\"}', '2026-10-17 00:57:08', '2026-10-17 00:57:08'),
(82, 37, 1, 'paused', '{\"from\":\"in_progress\",\"to\":\"paused\"}', '2026-10-17 00:57:15', '2026-10-17 00:57:15'),
(83, 36, 5, 'started', '{\"from\":\"open\",\"to\":\"in_progress\"}', '2026-10-17 02:08:44', '2026-10-17 02:08:44'),
(84, 36, 5, 'resolved', '{\"from\":\"in_progress\",\"to\":\"resolved\"}', '2026-10-17 02:08:46', '2026-10-17 02:08:46'),
(88, 37, 1, 'resumed', '{\"from\":\"paused\",\"to\":\"in_progress\"}', '2026-10-17 22:30:33', '2026-10-17 22:30:33'),
(89, 37, 1, 'resolved', '{\"from\":\"in_progress\",\"to\":\"resolved\"}', '2026-10-17 22:30:39', '2026-10-17 22:30:39'),
(96, 15, 1, 'assigned', '{\"to_id\":1,\"to_name\":\"Super Admin\"}', '2026-10-17 23:06:45', '2026-10-17 23:06:45');

-- --------------------------------------------------------

--
-- Struktur dari tabel `task_comments`
--

CREATE TABLE `task_comments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `task_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `body` text NOT NULL,
  `edited_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `task_comments`
--

INSERT INTO `task_comments` (`id`, `task_id`, `user_id`, `body`, `edited_at`, `created_at`, `updated_at`) VALUES
(16, 36, 1, 'asdad', NULL, '2026-10-17 23:08:15', '2026-10-17 23:08:15');

-- --------------------------------------------------------

--
-- Struktur dari tabel `teams`
--

CREATE TABLE `teams` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `teams`
--

INSERT INTO `teams` (`id`, `name`, `slug`, `description`, `logo`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Development', 'development', 'Tim pengembangan produk dan sistem.', NULL, 'active', '2026-10-13 23:43:10', '2026-10-13 23:43:10'),
(2, 'Marketing', 'marketing', 'Tim pemasaran dan komunikasi.', NULL, 'active', '2026-10-13 23:43:10', '2026-10-13 23:43:10'),
(3, 'Operations', 'operations', 'Tim operasional harian perusahaan.', NULL, 'active', '2026-10-13 23:43:10', '2026-10-13 23:43:10'),
(4, 'Finance', 'finance', 'Tim keuangan dan akuntansi.', NULL, 'active', '2026-10-13 23:43:10', '2026-10-13 23:43:10'),
(5, 'Unit Teknik', 'unit-teknik', 'Unit technique: jaringan, perangkat keras, dan instalasi.', 'uploads/teams/logo_9234b5bf79d1eb8a0edd7330159f281c.jpg', 'active', '2026-10-13 23:43:12', '2026-10-16 01:23:40'),
(6, 'Unit Operasional', 'unit-operasional', 'Unit operasional: distribusi, logistik, dan lapangan.', NULL, 'active', '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(7, 'Unit Keuangan', 'unit-keuangan', 'Unit keuangan: administrasi, pelaporan, dan akuntansi.', NULL, 'active', '2026-10-13 23:43:13', '2026-10-13 23:43:13');

-- --------------------------------------------------------

--
-- Struktur dari tabel `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `role` varchar(255) NOT NULL DEFAULT 'viewer',
  `team_id` bigint(20) UNSIGNED DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `denied_permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`denied_permissions`)),
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `users`
--

INSERT INTO `users` (`id`, `name`, `phone`, `email`, `avatar`, `role`, `team_id`, `status`, `denied_permissions`, `email_verified_at`, `password`, `remember_token`, `created_at`, `updated_at`) VALUES
(1, 'Super Admin', NULL, 'superadmin@example.com', 'uploads/avatars/avatar_1354d67ee97220808c58d3a188f0d868.jpg', 'super_admin', NULL, 'active', NULL, NULL, '$2y$12$BGRCV5Abedk8CPof7PQSheGpS4MVaBhe66vR.83.3H/BYADDRTid6', NULL, '2026-10-13 23:43:10', '2026-10-20 21:03:29'),
(2, 'Admin User', NULL, 'admin@example.com', NULL, 'admin', 1, 'active', NULL, NULL, '$2y$12$gqtn9aaqqmVIXQIrydZCau8YZI33A0EkGuX8iitqVvZ3WJ.n2bbPa', NULL, '2026-10-13 23:43:10', '2026-10-13 23:43:10'),
(3, 'Staff User', NULL, 'staff@example.com', NULL, 'staff', 2, 'active', NULL, NULL, '$2y$12$BhYPDwW1RHTf78MRcUR4h.5Fv/Lmjmvpq4BZiId6PDSk8NL0gZAsS', NULL, '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(4, 'Viewer User', NULL, 'viewer@example.com', NULL, 'viewer', 3, 'active', NULL, NULL, '$2y$12$5Dz.kQbSAcF/hbmthInZae4bK3kCHtiMLQgDybAk5zIjIw9dZ2jxG', NULL, '2026-10-13 23:43:11', '2026-10-13 23:43:11'),
(5, 'Budi Santoso', NULL, 'owner.budi@example.com', NULL, 'owner', 5, 'active', NULL, NULL, '$2y$12$QcmcKrTcEjt1toi9xxw1b.sixrpdXfyWBCMwAyf9nfQYNr4Qod2Qe', NULL, '2026-10-13 23:43:12', '2026-10-13 23:43:12'),
(6, 'Siti Rahma', NULL, 'owner.siti@example.com', NULL, 'owner', 6, 'active', NULL, NULL, '$2y$12$Jh8xPGOfRJ446QzG2bLfGuLg30mz4vBAwKqJ9swdikBz9vCVjkJGG', NULL, '2026-10-13 23:43:12', '2026-10-15 21:29:37'),
(7, 'Andi Wijaya', NULL, 'owner.andi@example.com', NULL, 'owner', 7, 'active', NULL, NULL, '$2y$12$BuJzXuHUCVWr0v3g6dwvpOdLuro9PtrLpoxxFMvBeJi5OoQZT5nZK', NULL, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(8, 'asdas', '121414', 'informazgt@gmail.com', NULL, 'admin', NULL, 'active', NULL, NULL, '$2y$12$VYHSIwS8iy8EuLCTdxA2MOIMcE63oyuCBhDsFq2W10fueM0Utg7Ym', NULL, '2026-10-17 00:03:00', '2026-10-17 00:03:00');

-- --------------------------------------------------------

--
-- Struktur dari tabel `vehicle_assets`
--

CREATE TABLE `vehicle_assets` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `asset_code` varchar(255) NOT NULL,
  `photo` varchar(255) DEFAULT NULL,
  `brand` varchar(255) NOT NULL,
  `model` varchar(255) NOT NULL,
  `year` varchar(4) DEFAULT NULL,
  `plate_number` varchar(255) DEFAULT NULL,
  `engine_number` varchar(255) DEFAULT NULL,
  `chassis_number` varchar(255) DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `purchase_price` decimal(15,2) DEFAULT NULL,
  `last_tax_amount` decimal(15,2) DEFAULT NULL,
  `tax_due_date` date DEFAULT NULL,
  `tax_status` varchar(255) NOT NULL DEFAULT 'UNPAID',
  `description` text DEFAULT NULL,
  `condition` varchar(255) NOT NULL DEFAULT 'GOOD',
  `usage_status` varchar(255) NOT NULL DEFAULT 'IN_STORAGE',
  `team_id` bigint(20) UNSIGNED DEFAULT NULL,
  `room_id` bigint(20) UNSIGNED DEFAULT NULL,
  `assigned_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `placement_date` date DEFAULT NULL,
  `supplier_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `vehicle_assets`
--

INSERT INTO `vehicle_assets` (`id`, `asset_code`, `photo`, `brand`, `model`, `year`, `plate_number`, `engine_number`, `chassis_number`, `purchase_date`, `purchase_price`, `last_tax_amount`, `tax_due_date`, `tax_status`, `description`, `condition`, `usage_status`, `team_id`, `room_id`, `assigned_user_id`, `placement_date`, `supplier_id`, `created_at`, `updated_at`) VALUES
(1, 'VHC-001', NULL, 'Honda', 'Vario 160', '2023', 'B 1234 ABC', NULL, NULL, '2025-10-14', 25000000.00, 1250000.00, '2027-10-14', 'PAID', 'Motor lapangan teknisi unit teknik.', 'GOOD', 'IN_USE', 5, 1, 5, NULL, 1, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(2, 'VHC-004', NULL, 'Honda', 'Beat CBS', '2023', 'B 2345 KLM', NULL, NULL, '2026-02-14', 17500000.00, NULL, '2026-10-26', 'UNPAID', 'Motor kedua tim lapangan teknik.', 'GOOD', 'IN_USE', 5, 1, 5, NULL, 1, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(3, 'VHC-002', NULL, 'Yamaha', 'NMAX 155', '2022', 'D 5678 EFG', NULL, NULL, '2024-10-14', 31000000.00, NULL, '2026-10-17', 'UNPAID', 'Motor pengantar tim unit operasional.', 'GOOD', 'IN_USE', 6, 2, 6, NULL, 2, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(4, 'VHC-005', NULL, 'Yamaha', 'Mio Gear 125', '2021', 'F 3456 MNO', NULL, NULL, '2023-10-14', 19500000.00, 640000.00, '2027-04-14', 'PAID', 'Motor operasional harian.', 'GOOD', 'IN_USE', 6, 2, 6, NULL, 2, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(5, 'VHC-006', NULL, 'Suzuki', 'Shogun 125', '2022', 'D 4567 PQR', NULL, NULL, '2025-08-14', 21500000.00, NULL, '2026-11-08', 'UNPAID', 'Motor cadangan armada operasional.', 'GOOD', 'IN_USE', 6, 2, 6, NULL, 3, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(6, 'VHC-003', NULL, 'Suzuki', 'Satria F150', '2020', 'F 9012 HIJ', NULL, NULL, '2023-10-14', 22500000.00, NULL, '2026-09-24', 'UNPAID', 'Pajak sudah melewati jatuh tempo.', 'GOOD', 'IN_USE', 7, 3, 7, NULL, 3, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(7, 'VHC-007', NULL, 'Honda', 'Vario 160', '2024', 'B 5678 STU', NULL, NULL, '2026-06-14', 27500000.00, 1250000.00, '2027-06-14', 'PAID', 'Motor pengantar berkas keuangan.', 'GOOD', 'IN_USE', 7, 3, 7, NULL, 1, '2026-10-13 23:43:13', '2026-10-13 23:43:13');

-- --------------------------------------------------------

--
-- Struktur dari tabel `vehicle_taxes`
--

CREATE TABLE `vehicle_taxes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `vehicle_id` bigint(20) UNSIGNED NOT NULL,
  `tax_due_date` date DEFAULT NULL,
  `pkb` decimal(15,2) NOT NULL DEFAULT 0.00,
  `swdkllj` decimal(15,2) NOT NULL DEFAULT 0.00,
  `opsen_pkb` decimal(15,2) NOT NULL DEFAULT 0.00,
  `administrative_fee` decimal(15,2) NOT NULL DEFAULT 0.00,
  `penalty` decimal(15,2) NOT NULL DEFAULT 0.00,
  `other_fee` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_tax` decimal(15,2) NOT NULL DEFAULT 0.00,
  `payment_date` date DEFAULT NULL,
  `payment_status` varchar(255) NOT NULL DEFAULT 'UNPAID',
  `payment_proof` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `vehicle_taxes`
--

INSERT INTO `vehicle_taxes` (`id`, `vehicle_id`, `tax_due_date`, `pkb`, `swdkllj`, `opsen_pkb`, `administrative_fee`, `penalty`, `other_fee`, `total_tax`, `payment_date`, `payment_status`, `payment_proof`, `notes`, `created_at`, `updated_at`) VALUES
(1, 1, '2025-11-14', 985000.00, 35000.00, 220000.00, 10000.00, 0.00, 0.00, 1250000.00, '2025-11-17', 'PAID', NULL, NULL, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(2, 2, '2026-10-26', 430000.00, 35000.00, 120000.00, 10000.00, 0.00, 0.00, 595000.00, NULL, 'UNPAID', NULL, NULL, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(3, 3, '2026-10-17', 1150000.00, 35000.00, 250000.00, 15000.00, 0.00, 0.00, 1450000.00, NULL, 'UNPAID', NULL, NULL, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(4, 4, '2026-04-14', 580000.00, 35000.00, 140000.00, 10000.00, 0.00, 0.00, 765000.00, '2026-04-16', 'PAID', NULL, NULL, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(5, 5, '2026-11-08', 690000.00, 35000.00, 160000.00, 10000.00, 0.00, 0.00, 895000.00, NULL, 'UNPAID', NULL, NULL, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(6, 6, '2026-09-24', 890000.00, 40000.00, 190000.00, 10000.00, 25000.00, 5000.00, 1160000.00, NULL, 'UNPAID', NULL, NULL, '2026-10-13 23:43:13', '2026-10-13 23:43:13'),
(7, 7, '2026-06-14', 985000.00, 35000.00, 220000.00, 10000.00, 0.00, 0.00, 1250000.00, '2026-06-18', 'PAID', NULL, NULL, '2026-10-13 23:43:13', '2026-10-13 23:43:13');

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `assets`
--
ALTER TABLE `assets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `assets_asset_code_unique` (`asset_code`),
  ADD KEY `assets_room_id_foreign` (`room_id`),
  ADD KEY `assets_category_id_foreign` (`category_id`),
  ADD KEY `assets_team_id_foreign` (`team_id`),
  ADD KEY `assets_assigned_user_id_foreign` (`assigned_user_id`),
  ADD KEY `assets_condition_index` (`condition`),
  ADD KEY `assets_usage_status_index` (`usage_status`);

--
-- Indeks untuk tabel `asset_assignments`
--
ALTER TABLE `asset_assignments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `asset_assignments_asset_id_foreign` (`asset_id`),
  ADD KEY `asset_assignments_team_id_foreign` (`team_id`),
  ADD KEY `asset_assignments_room_id_foreign` (`room_id`),
  ADD KEY `asset_assignments_assigned_user_id_foreign` (`assigned_user_id`),
  ADD KEY `asset_assignments_assigned_date_index` (`assigned_date`);

--
-- Indeks untuk tabel `asset_damages`
--
ALTER TABLE `asset_damages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `asset_damages_asset_id_foreign` (`asset_id`),
  ADD KEY `asset_damages_user_id_foreign` (`user_id`),
  ADD KEY `asset_damages_responsible_id_foreign` (`responsible_id`),
  ADD KEY `asset_damages_performed_by_id_foreign` (`performed_by_id`),
  ADD KEY `asset_damages_damage_date_index` (`damage_date`),
  ADD KEY `asset_damages_room_id_foreign` (`room_id`);

--
-- Indeks untuk tabel `asset_transfers`
--
ALTER TABLE `asset_transfers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `asset_transfers_asset_id_foreign` (`asset_id`),
  ADD KEY `asset_transfers_from_team_id_foreign` (`from_team_id`),
  ADD KEY `asset_transfers_to_team_id_foreign` (`to_team_id`),
  ADD KEY `asset_transfers_from_room_id_foreign` (`from_room_id`),
  ADD KEY `asset_transfers_to_room_id_foreign` (`to_room_id`),
  ADD KEY `asset_transfers_from_user_id_foreign` (`from_user_id`),
  ADD KEY `asset_transfers_to_user_id_foreign` (`to_user_id`),
  ADD KEY `asset_transfers_performed_by_id_foreign` (`performed_by_id`),
  ADD KEY `asset_transfers_transfer_date_index` (`transfer_date`);

--
-- Indeks untuk tabel `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `audit_logs_user_id_foreign` (`user_id`),
  ADD KEY `audit_logs_auditable_type_auditable_id_index` (`auditable_type`,`auditable_id`),
  ADD KEY `audit_logs_event_index` (`event`),
  ADD KEY `audit_logs_auditable_type_index` (`auditable_type`),
  ADD KEY `audit_logs_auditable_id_index` (`auditable_id`);

--
-- Indeks untuk tabel `cache`
--
ALTER TABLE `cache`
  ADD PRIMARY KEY (`key`),
  ADD KEY `cache_expiration_index` (`expiration`);

--
-- Indeks untuk tabel `cache_locks`
--
ALTER TABLE `cache_locks`
  ADD PRIMARY KEY (`key`),
  ADD KEY `cache_locks_expiration_index` (`expiration`);

--
-- Indeks untuk tabel `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `categories_team_id_code_unique` (`team_id`,`code`),
  ADD KEY `categories_team_id_index` (`team_id`);

--
-- Indeks untuk tabel `failed_jobs`
--
ALTER TABLE `failed_jobs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`);

--
-- Indeks untuk tabel `jobs`
--
ALTER TABLE `jobs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `jobs_queue_index` (`queue`);

--
-- Indeks untuk tabel `job_batches`
--
ALTER TABLE `job_batches`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `model_has_permissions`
--
ALTER TABLE `model_has_permissions`
  ADD PRIMARY KEY (`permission_id`,`model_id`,`model_type`),
  ADD KEY `model_has_permissions_model_id_model_type_index` (`model_id`,`model_type`);

--
-- Indeks untuk tabel `model_has_roles`
--
ALTER TABLE `model_has_roles`
  ADD PRIMARY KEY (`role_id`,`model_id`,`model_type`),
  ADD KEY `model_has_roles_model_id_model_type_index` (`model_id`,`model_type`);

--
-- Indeks untuk tabel `network_nodes`
--
ALTER TABLE `network_nodes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `network_nodes_asset_id_unique` (`asset_id`),
  ADD KEY `network_nodes_node_type_index` (`node_type`),
  ADD KEY `network_nodes_status_index` (`status`),
  ADD KEY `network_nodes_room_id_index` (`room_id`),
  ADD KEY `network_nodes_parent_id_index` (`parent_id`);

--
-- Indeks untuk tabel `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`email`);

--
-- Indeks untuk tabel `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `permissions_name_guard_name_unique` (`name`,`guard_name`);

--
-- Indeks untuk tabel `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  ADD KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  ADD KEY `personal_access_tokens_expires_at_index` (`expires_at`);

--
-- Indeks untuk tabel `purchases`
--
ALTER TABLE `purchases`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `purchases_purchase_number_unique` (`purchase_number`),
  ADD KEY `purchases_asset_id_foreign` (`asset_id`),
  ADD KEY `purchases_purchase_date_index` (`purchase_date`);

--
-- Indeks untuk tabel `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `roles_name_guard_name_unique` (`name`,`guard_name`);

--
-- Indeks untuk tabel `role_has_permissions`
--
ALTER TABLE `role_has_permissions`
  ADD PRIMARY KEY (`permission_id`,`role_id`),
  ADD KEY `role_has_permissions_role_id_foreign` (`role_id`);

--
-- Indeks untuk tabel `rooms`
--
ALTER TABLE `rooms`
  ADD PRIMARY KEY (`id`),
  ADD KEY `rooms_team_id_index` (`team_id`);

--
-- Indeks untuk tabel `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sessions_user_id_index` (`user_id`),
  ADD KEY `sessions_last_activity_index` (`last_activity`);

--
-- Indeks untuk tabel `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `settings_key_unique` (`key`);

--
-- Indeks untuk tabel `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `suppliers_name_unique` (`name`);

--
-- Indeks untuk tabel `tasks`
--
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tasks_reporter_id_foreign` (`reporter_id`),
  ADD KEY `tasks_handled_by_foreign` (`handled_by`),
  ADD KEY `tasks_status_priority_index` (`status`,`priority`),
  ADD KEY `tasks_assigned_to_foreign` (`assigned_to`),
  ADD KEY `tasks_team_id_index` (`team_id`);

--
-- Indeks untuk tabel `task_activities`
--
ALTER TABLE `task_activities`
  ADD PRIMARY KEY (`id`),
  ADD KEY `task_activities_user_id_foreign` (`user_id`),
  ADD KEY `task_activities_task_id_created_at_index` (`task_id`,`created_at`);

--
-- Indeks untuk tabel `task_comments`
--
ALTER TABLE `task_comments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `task_comments_user_id_foreign` (`user_id`),
  ADD KEY `task_comments_task_id_created_at_index` (`task_id`,`created_at`);

--
-- Indeks untuk tabel `teams`
--
ALTER TABLE `teams`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `teams_slug_unique` (`slug`);

--
-- Indeks untuk tabel `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_unique` (`email`),
  ADD KEY `users_team_id_foreign` (`team_id`),
  ADD KEY `users_role_index` (`role`),
  ADD KEY `users_status_index` (`status`);

--
-- Indeks untuk tabel `vehicle_assets`
--
ALTER TABLE `vehicle_assets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `vehicle_assets_asset_code_unique` (`asset_code`),
  ADD KEY `vehicle_assets_team_id_foreign` (`team_id`),
  ADD KEY `vehicle_assets_room_id_foreign` (`room_id`),
  ADD KEY `vehicle_assets_assigned_user_id_foreign` (`assigned_user_id`),
  ADD KEY `vehicle_assets_condition_index` (`condition`),
  ADD KEY `vehicle_assets_usage_status_index` (`usage_status`),
  ADD KEY `vehicle_assets_tax_due_date_index` (`tax_due_date`),
  ADD KEY `vehicle_assets_supplier_id_foreign` (`supplier_id`);

--
-- Indeks untuk tabel `vehicle_taxes`
--
ALTER TABLE `vehicle_taxes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `vehicle_taxes_vehicle_id_index` (`vehicle_id`),
  ADD KEY `vehicle_taxes_payment_status_index` (`payment_status`),
  ADD KEY `vehicle_taxes_tax_due_date_index` (`tax_due_date`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `assets`
--
ALTER TABLE `assets`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT untuk tabel `asset_assignments`
--
ALTER TABLE `asset_assignments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT untuk tabel `asset_damages`
--
ALTER TABLE `asset_damages`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `asset_transfers`
--
ALTER TABLE `asset_transfers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT untuk tabel `categories`
--
ALTER TABLE `categories`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT untuk tabel `failed_jobs`
--
ALTER TABLE `failed_jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `jobs`
--
ALTER TABLE `jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=50;

--
-- AUTO_INCREMENT untuk tabel `network_nodes`
--
ALTER TABLE `network_nodes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT untuk tabel `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=67;

--
-- AUTO_INCREMENT untuk tabel `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=103;

--
-- AUTO_INCREMENT untuk tabel `purchases`
--
ALTER TABLE `purchases`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT untuk tabel `roles`
--
ALTER TABLE `roles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT untuk tabel `rooms`
--
ALTER TABLE `rooms`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT untuk tabel `settings`
--
ALTER TABLE `settings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT untuk tabel `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT untuk tabel `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=46;

--
-- AUTO_INCREMENT untuk tabel `task_activities`
--
ALTER TABLE `task_activities`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=105;

--
-- AUTO_INCREMENT untuk tabel `task_comments`
--
ALTER TABLE `task_comments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT untuk tabel `teams`
--
ALTER TABLE `teams`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT untuk tabel `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT untuk tabel `vehicle_assets`
--
ALTER TABLE `vehicle_assets`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT untuk tabel `vehicle_taxes`
--
ALTER TABLE `vehicle_taxes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `assets`
--
ALTER TABLE `assets`
  ADD CONSTRAINT `assets_assigned_user_id_foreign` FOREIGN KEY (`assigned_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `assets_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `assets_room_id_foreign` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `assets_team_id_foreign` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `asset_assignments`
--
ALTER TABLE `asset_assignments`
  ADD CONSTRAINT `asset_assignments_asset_id_foreign` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `asset_assignments_assigned_user_id_foreign` FOREIGN KEY (`assigned_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `asset_assignments_room_id_foreign` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `asset_assignments_team_id_foreign` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `asset_damages`
--
ALTER TABLE `asset_damages`
  ADD CONSTRAINT `asset_damages_asset_id_foreign` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `asset_damages_performed_by_id_foreign` FOREIGN KEY (`performed_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `asset_damages_responsible_id_foreign` FOREIGN KEY (`responsible_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `asset_damages_room_id_foreign` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `asset_damages_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `asset_transfers`
--
ALTER TABLE `asset_transfers`
  ADD CONSTRAINT `asset_transfers_asset_id_foreign` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `asset_transfers_from_room_id_foreign` FOREIGN KEY (`from_room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `asset_transfers_from_team_id_foreign` FOREIGN KEY (`from_team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `asset_transfers_from_user_id_foreign` FOREIGN KEY (`from_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `asset_transfers_performed_by_id_foreign` FOREIGN KEY (`performed_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `asset_transfers_to_room_id_foreign` FOREIGN KEY (`to_room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `asset_transfers_to_team_id_foreign` FOREIGN KEY (`to_team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `asset_transfers_to_user_id_foreign` FOREIGN KEY (`to_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `categories`
--
ALTER TABLE `categories`
  ADD CONSTRAINT `categories_team_id_foreign` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `model_has_permissions`
--
ALTER TABLE `model_has_permissions`
  ADD CONSTRAINT `model_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `model_has_roles`
--
ALTER TABLE `model_has_roles`
  ADD CONSTRAINT `model_has_roles_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `network_nodes`
--
ALTER TABLE `network_nodes`
  ADD CONSTRAINT `network_nodes_asset_id_foreign` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `network_nodes_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `network_nodes` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `network_nodes_room_id_foreign` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`);

--
-- Ketidakleluasaan untuk tabel `purchases`
--
ALTER TABLE `purchases`
  ADD CONSTRAINT `purchases_asset_id_foreign` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `role_has_permissions`
--
ALTER TABLE `role_has_permissions`
  ADD CONSTRAINT `role_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `role_has_permissions_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `rooms`
--
ALTER TABLE `rooms`
  ADD CONSTRAINT `rooms_team_id_foreign` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `tasks`
--
ALTER TABLE `tasks`
  ADD CONSTRAINT `tasks_assigned_to_foreign` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `tasks_handled_by_foreign` FOREIGN KEY (`handled_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `tasks_reporter_id_foreign` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `tasks_team_id_foreign` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `task_activities`
--
ALTER TABLE `task_activities`
  ADD CONSTRAINT `task_activities_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `task_activities_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `task_comments`
--
ALTER TABLE `task_comments`
  ADD CONSTRAINT `task_comments_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `task_comments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_team_id_foreign` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `vehicle_assets`
--
ALTER TABLE `vehicle_assets`
  ADD CONSTRAINT `vehicle_assets_assigned_user_id_foreign` FOREIGN KEY (`assigned_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `vehicle_assets_room_id_foreign` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `vehicle_assets_supplier_id_foreign` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `vehicle_assets_team_id_foreign` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `vehicle_taxes`
--
ALTER TABLE `vehicle_taxes`
  ADD CONSTRAINT `vehicle_taxes_vehicle_id_foreign` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle_assets` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
