from pycontrol.hardware import Port, I2CConnector, DigitalOutput

# MCU family this breakout's pin geometry is wired for. The host reads it
# statically (pycontrol.workspace.hwdef_inspect) to pre-flight setups.
MCU = "stm32h743"

class HubH743:
    def __init__(self):
        self.qwiic = I2CConnector(SCL="B10", SDA="B11", I2C=2)  # Shares the I2C-2 bus with port_1.

        self.port_1 = Port(DIO_A="B10", DIO_B="B11", DIO_C="A4", POW_A="C2", POW_B="C3", UART=3, I2C=2, DAC=1)
        self.port_2 = Port(DIO_A="A0", DIO_B="A1", POW_A="E5", POW_B="E6", POW_C="D3")
        self.port_3 = Port(DIO_A="B13", DIO_B="B12", POW_A="E1", POW_B="E4", POW_C="A7", UART=5)
        self.port_4 = Port(DIO_A="C6", DIO_B="C7", DIO_C="B14", POW_A="D0", POW_B="E0", UART=6)
        self.port_5 = Port(DIO_A="E8", DIO_B="E7", DIO_C="E9", POW_A="B7", POW_B="D5", UART=7)
        self.port_6 = Port(DIO_A="B8", DIO_B="B9", DIO_C="A5", POW_A="D6", POW_B="D7", I2C=1, DAC=2)
        self.port_7 = Port(DIO_A="B5", DIO_B="B4", DIO_C="B3", POW_A="D14", POW_B="D15")
        self.port_8 = Port(DIO_A="E14", DIO_B="E13", DIO_C="E12", POW_A="D9", POW_B="D10")
        self.port_9 = Port(DIO_A="A9", DIO_B="A10", DIO_C="A6", POW_A="B15", POW_B="D8", UART=1)
        self.port_10 = Port(DIO_A="A2", DIO_B="A3", DIO_C="D1", POW_A="E10", POW_B="E15", UART=2)
        self.port_11 = Port(DIO_A="C10", DIO_B="C11", DIO_C="B0", POW_A="C4", POW_B="C5", UART=4)

        self.led_red = DigitalOutput("E11", inverted=True)
        self.led_yellow = DigitalOutput("C9", inverted=True)
        self.led_green = DigitalOutput("E3", inverted=True)
        self.led_blue = DigitalOutput("D2", inverted=True)

        # Pulled up to 3.3 V; pressing a button pulls the pin low (triggering a falling event)
        self.BUTTON_A = self.BUTTON = "C13"
        self.BUTTON_B = "C12"
        self.BUTTON_C = "D4"
        self.BUTTON_D = "A15"

        self.BNC_1 = "C0"
        self.BNC_2 = "C1"

        self.DAC_1 = "A4"  # port_1 DIO_C
        self.DAC_2 = "A5"  # port_6 DIO_C
