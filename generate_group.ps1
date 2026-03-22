$months = @('Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre')

$gastos = @(
    @('Hipoteca', 482.51, @(1..12)),
    @('Herbalife', 130.00, @(1..12)),
    @('Crédito', 193.41, @(1..12)),
    @('Otros', 160.00, @(1, 2, 3, 4, 5, 9, 10, 11, 12)),
    @('Otros', 190.00, @(4, 5)),
    @('Otros', 95.00, @(6, 7)),
    @('Alimentación', 600.00, @(1..12)),
    @('Servicios', 50.00, @(1..12)),
    @('Combustible', 250.00, @(1..12)),
    @('Servicios', 40.00, @(1..12)),
    @('Suscripciones', 22.00, @(1..12)),
    @('Gimnasio', 85.00, @(1, 2, 3, 4, 5)),
    @('Gimnasio', 90.00, @(6, 9, 10, 11, 12)),
    @('Servicios', 40.00, @(4, 7, 10)),
    @('Impuestos', 35.00, @(3)),
    @('Seguros', 270.00, @(4, 10)),
    @('Seguros', 261.90, @(3)),
    @('Seguros', 260.00, @(9)),
    @('Seguros', 71.68, @(3)),
    @('Seguros', 181.28, @(3)),
    @('Seguros', 164.41, @(9)),
    @('Seguros', 11.33, @(1..12)),
    @('Impuestos', 250.00, @(7, 8)),
    @('Impuestos', 54.25, @(1, 2, 3, 4, 5, 6, 7)),
    @('Impuestos', 85.00, @(5)),
    @('Impuestos', 42.00, @(4)),
    @('Otros', 55.70, @(2)),
    @('Otros', 43.35, @(8)),
    @('Otros', 780.00, @(7)),
    @('Servicios', 22.00, @(4, 10)),
    @('Servicios', 700.00, @(7)),
    @('Otros', 30.00, @(1..12)),
    @('Otros', 100.00, @(1..12)),
    @('Otros', 60.00, @(1..12)),
    @('Otros', 300.00, @(5, 10)),
    @('Otros', 300.00, @(9))
)

$ingresos = @(
    @('Nómina', 1500.00, @(1..12)),
    @('Nómina', 857.39, @(1..12)),
    @('Nómina', 998.00, @(6, 11)),
    @('Nómina', 850.00, @(6, 11)),
    @('Zumba', 250.00, @(1, 2, 3, 4, 5, 9, 10, 11, 12)),
    @('FullBody', 175.00, @(1..12)),
    @('Herbalife', 60.00, @(1..12))
)

$aggregated = @{}

foreach ($item in ($ingresos + $gastos)) {
    $cat = $item[0]
    $amt = $item[1]
    foreach ($m in $item[2]) {
        $key = "{0:D2}|$cat" -f $m
        if (-not $aggregated.ContainsKey($key)) {
            $aggregated[$key] = 0.0
        }
        $aggregated[$key] += $amt
    }
}

$output = "Año;Mes;Categoría;Presupuesto`n"
foreach ($key in $aggregated.Keys | Sort-Object) {
    $parts = $key.Split('|')
    $m = [int]$parts[0]
    $m_name = $months[$m-1]
    $cat = $parts[1]
    $val = $aggregated[$key]
    $val_str = $val.ToString("0.00", [System.Globalization.CultureInfo]::InvariantCulture).Replace('.', ',')
    $output += "2026;$m_name;$cat;$val_str`n"
}

[IO.File]::WriteAllText("presupuesto_agrupado.csv", $output, [Text.Encoding]::UTF8)
Write-Output "DONE"
