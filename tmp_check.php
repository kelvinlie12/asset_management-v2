<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
$u = App\Models\User::where('email','viewer@example.com')->first();
var_dump($u ? $u->role : 'null');
$perms = $u ? $u->getRoleAbilities() : [];
var_dump(in_array('work_teams.view', $perms));
$u2 = App\Models\User::where('email','staff@example.com')->first();
var_dump($u2 ? $u2->role : 'null');
var_dump(in_array('work_teams.create', $u2 ? $u2->getRoleAbilities() : []));
$u3 = App\Models\User::where('email','admin@example.com')->first();
var_dump($u3 ? $u3->role : 'null');
var_dump(in_array('work_teams.delete', $u3 ? $u3->getRoleAbilities() : []));
$sa = App\Models\User::where('email','superadmin@example.com')->first();
var_dump($sa ? $sa->role : 'null');
var_dump(in_array('work_teams.delete', $sa ? $sa->getRoleAbilities() : []));
