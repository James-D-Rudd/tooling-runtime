from aider_tty_wrapper import AiderTTYWrapper

def run_aider_as_tty():
    wrapper = AiderTTYWrapper()
    wrapper.start()

    while True:
        output = wrapper.read_output()
        print(output)

        command = input(">>> ")
        wrapper.send_command(command)


def main():
    run_aider_as_tty()


if __name__ == "__main__":
    main()
