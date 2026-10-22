<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo Spatie\Permission\Models\Permission::where('name', 'like', 'work_teams%')->count()." work_team permissions\n";
echo App\Models\Team::count()." teams\n";
foreach (App\Models\Team::all() as $t) {
    echo ' - '.$t->id.' '.$t->name."\n";
}
echo App\Models\WorkTeam::count()." work teams\n";
echo "=== users ===\n";
foreach (App\Models\User::all() as $u) {
    echo ' - '.$u->id.' '.$u->email.' role='.$u->role.' team_id='.($u->team_id ?? 'null')."\n";
}
