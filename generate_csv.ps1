$months = @('Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre')

$data = @(
    @('Nómina Raúl', '1500,00', @(1,2,3,4,5,6,7,8,9,10,11,12)),
    @('Nómina Eva', '857,39', @(1,2,3,4,5,6,7,8,9,10,11,12)),
    @('Paga Extra Raúl', '998,00', @(6, 11)),
    @('Paga Extra Eva', '850,00', @(6, 11)),
    @('Zumba', '250,00', @(1, 2, 3, 4, 5, 9, 10, 11, 12)),
    @('Full Body', '175,00', @(1,2,3,4,5,6,7,8,9,10,11,12)),
    @('Herbalife', '60,00', @(1,2,3,4,5,6,7,8,9,10,11,12)),
    @('Hipoteca', '482,51', @(1,2,3,4,5,6,7,8,9,10,11,12)),
    @('Herbalife consumo', '100,00', @(1,2,3,4,5,6,7,8,9,10,11,12)),
    @('Sistema Domingos (HL)', '30,00', @(1,2,3,4,5,6,7,8,9,10,11,12)),
    @('Credito Placas', '113,00', @(1,2,3,4,5,6,7,8,9,10,11,12)),
    @('Crédito CETELEM', '36,00', @(1,2,3,4,5,6,7,8,9,10,11,12)),
    @('Tarjeta de crédito ING', '44,41', @(1,2,3,4,5,6,7,8,9,10,11,12)),
    @('Psicología Erik', '160,00', @(1, 2, 3, 4, 5, 9, 10, 11, 12)),
    @('Psicología Raúl', '190,00', @(4, 5)),
    @('Psicología Raúl', '95,00', @(6, 7)),
    @('Comida', '600,00', @(1,2,3,4,5,6,7,8,9,10,11,12)),
    @('Luz', '50,00', @(1,2,3,4,5,6,7,8,9,10,11,12)),
    @('Combustible coches', '250,00', @(1,2,3,4,5,6,7,8,9,10,11,12)),
    @('Teléfono', '40,00', @(1,2,3,4,5,6,7,8,9,10,11,12)),
    @('Plataformas digitales', '22,00', @(1,2,3,4,5,6,7,8,9,10,11,12)),
    @('Kung Fu', '85,00', @(1, 2, 3, 4, 5)),
    @('Kung Fu', '90,00', @(6, 9, 10, 11, 12)),
    @('Agua', '40,00', @(4, 7, 10)),
    @('Tasa basura', '35,00', @(3)),
    @('Seguro coche', '270,00', @(4, 10)),
    @('Seguros furgoneta', '261,90', @(3)),
    @('Seguros furgoneta', '260,00', @(9)),
    @('Seguro vida Eva', '71,68', @(3)),
    @('Seguro hogar', '181,28', @(3)),
    @('Seguro hogar', '164,41', @(9)),
    @('Seguro decesos', '11,33', @(1,2,3,4,5,6,7,8,9,10,11,12)),
    @('IBI', '250,00', @(7, 8)),
    @('Declaración de la RENTA', '54,25', @(1, 2, 3, 4, 5, 6, 7)),
    @('Numerito Furgo', '85,00', @(5)),
    @('Numerito coche', '42,00', @(4)),
    @('ITV ambos', '55,70', @(2)),
    @('ITV ambos', '43,35', @(8)),
    @('Revisiones auto', '780,00', @(7)),
    @('Bombona Butano', '22,00', @(4, 10)),
    @('Gasoil calefacción', '700,00', @(7)),
    @('Comida mascotas', '30,00', @(1,2,3,4,5,6,7,8,9,10,11,12)),
    @('Gastos Varios', '100,00', @(1,2,3,4,5,6,7,8,9,10,11,12)),
    @('Pagas Adrián', '60,00', @(1,2,3,4,5,6,7,8,9,10,11,12)),
    @('Veterinario', '300,00', @(5, 10)),
    @('Material escolar', '300,00', @(9))
)

Set-Content -Path 'presupuesto.csv' -Value 'Año;Mes;Categoría;Presupuesto' -Encoding UTF8
foreach ($item in $data) {
    $name = $item[0]
    $amt = $item[1]
    foreach ($m in $item[2]) {
        $m_name = $months[$m-1]
        Add-Content -Path 'presupuesto.csv' -Value "2026;$m_name;$name;$amt" -Encoding UTF8
    }
}
Write-Output "DONE"
