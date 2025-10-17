resource "aws_security_group" "ec2_sg" {
  name        = "ec2-instance-sg"
  description = "Allow SSH, Jenkins, and SonarQube access"
  vpc_id      = var.vpc_id
  tags        = merge(var.tags, { Name = "EC2-SecurityGroup" })
 
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
 
  ingress {
    description = "Jenkins"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
 
  ingress {
    description = "SonarQube"
    from_port   = 9000
    to_port     = 9000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
 
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
 
resource "aws_instance" "bastion" {
  ami                         = var.ami_id_ubuntu
  instance_type               = var.instance_types["bastion"]
  subnet_id                   = var.subnet_ids[0]
  key_name                    = var.key_name
  vpc_security_group_ids      = [aws_security_group.ec2_sg.id]
  associate_public_ip_address = true
  tags                        = merge(var.tags, { Name = "Bastion-Host" })
}
 
resource "aws_instance" "jenkins" {
  ami                         = var.ami_id_linux
  instance_type               = var.instance_types["jenkins"]
  subnet_id                   = var.subnet_ids[1]
  key_name                    = var.key_name
  vpc_security_group_ids      = [aws_security_group.ec2_sg.id]
  associate_public_ip_address = true
  tags                        = merge(var.tags, { Name = "Jenkins-Server" })
}
 
resource "aws_instance" "sonarqube" {
  ami                         = var.ami_id_linux
  instance_type               = var.instance_types["sonarqube"]
  subnet_id                   = var.subnet_ids[2]
  key_name                    = var.key_name
  vpc_security_group_ids      = [aws_security_group.ec2_sg.id]
  associate_public_ip_address = true
  tags                        = merge(var.tags, { Name = "SonarQube-Server" })
}