while true; do
  clear
  echo "Fetching resources usage for pods..."
  kubectl top pods -n expensio-dev
  sleep 0.5
done
