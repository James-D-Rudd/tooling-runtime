from aider_tty_wrapper import AiderTTYWrapper

def run_aider_as_tty():
    wrapper = AiderTTYWrapper()

    while True:
        output = AiderTTYWrapper.read_output(aider_proc, terminating_sequence)
        print(output)

        command = input(">>> ")
        AiderTTYWrapper.send_command(aider_proc, command)



def main():
    run_aider_as_tty()


if __name__ == "__main__":
    main()

